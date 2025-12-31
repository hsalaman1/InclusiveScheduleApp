# Bell Schedule Template System - Implementation Plan

## Project Overview

Building a bell schedule template system as part of a school scheduling application. The system provides pre-configured bell schedule templates for elementary, middle, and high schools that serve as customizable starting points.

**Stack:** TypeScript + React

---

## Phase 1: Project Foundation

### 1.1 Initialize Project Structure
- [ ] Create `package.json` with core dependencies
- [ ] Set up TypeScript configuration (`tsconfig.json`)
- [ ] Configure Vite as build tool (`vite.config.ts`)
- [ ] Create `.gitignore` file
- [ ] Set up base directory structure:
  ```
  src/
  ├── types/
  ├── data/
  ├── components/
  ├── utils/
  └── App.tsx
  ```

### 1.2 Dependencies
**Runtime:**
- `react` ^18.x
- `react-dom` ^18.x
- `uuid` ^9.x (for unique identifiers)

**Development:**
- `typescript` ^5.x
- `vite` ^5.x
- `@vitejs/plugin-react`
- `@types/react`, `@types/react-dom`, `@types/uuid`

---

## Phase 2: Type Definitions

### 2.1 Create Core Types (`src/types/index.ts`)

```typescript
// Period type - single time block
interface Period {
  id: string;                    // UUID v4
  name: string;                  // Display name
  startTime: string;             // "HH:MM" 24-hour format
  endTime: string;               // "HH:MM" 24-hour format
  isInstructional: boolean;      // Counts toward instructional minutes
  durationMinutes: number;       // Calculated duration
}

// BellSchedule type - complete daily schedule
interface BellSchedule {
  id: string;
  schoolType: 'elementary' | 'middle' | 'high';
  name: string;
  gradeLevels: string[];
  periods: Period[];
  totalInstructionalMinutes: number;
}
```

---

## Phase 3: Bell Schedule Templates Data

### 3.1 Create Helper Function (`src/data/bellScheduleTemplates.ts`)

`createPeriod()` function:
- Accepts name, startTime, endTime, isInstructional (default: true)
- Parses time strings to calculate duration
- Returns complete Period object with generated UUID

### 3.2 Create Three Templates

| Template | School Type | Grades | Total Instructional Minutes |
|----------|-------------|--------|----------------------------|
| Elementary | elementary | K-5 | 330 |
| Middle School | middle | 6-8 | 350 |
| High School | high | 9-12 | 385 |

#### Elementary Schedule (08:20 - 15:20)
10 periods including:
- Morning Meeting, ELA Block, Specials, Intervention/Enrichment
- Math Block, Lunch (non-instructional), Recess (non-instructional)
- Science/Social Studies, Specials, Closing/Dismissal

#### Middle School Schedule (09:30 - 16:20)
8 periods:
- Periods 1-7 (50 min each, instructional)
- Lunch (30 min, non-instructional)
- 5-minute passing periods between classes

#### High School Schedule (07:15 - 14:40)
8 periods:
- Periods 1-7 (55 min each, instructional)
- Lunch (30 min, non-instructional)
- 5-minute passing periods between classes

### 3.3 Export Template Collection
Export all templates as `bellScheduleTemplates` array for easy iteration

---

## Phase 4: Utility Functions

### 4.1 Core Utilities (`src/utils/scheduleUtils.ts`)

```typescript
// Calculate total instructional minutes
calculateInstructionalMinutes(periods: Period[]): number

// Get template by school type
getTemplateBySchoolType(schoolType: 'elementary' | 'middle' | 'high'): BellSchedule | undefined

// Clone template for customization
cloneTemplate(template: BellSchedule, newId: string, newName: string): BellSchedule

// Filter templates by grade level
getTemplatesForGrade(grade: string): BellSchedule[]

// Validate period times (no overlap, proper order)
validateSchedule(schedule: BellSchedule): ValidationResult
```

---

## Phase 5: React Components

### 5.1 Component Structure
```
src/components/
├── BellScheduleSelector/       # Template selection UI
│   ├── BellScheduleSelector.tsx
│   └── index.ts
├── ScheduleDisplay/            # View schedule periods
│   ├── ScheduleDisplay.tsx
│   ├── PeriodRow.tsx
│   └── index.ts
├── ScheduleEditor/             # Edit schedule (future)
│   ├── ScheduleEditor.tsx
│   └── index.ts
└── common/
    ├── TimeDisplay.tsx
    └── InstructionalBadge.tsx
```

### 5.2 Core Components

**BellScheduleSelector**
- Display available templates
- Filter by school type
- Show summary (grade levels, total instructional minutes)
- Selection callback

**ScheduleDisplay**
- Render periods in table format
- Show time, duration, instructional status
- Display total instructional minutes
- Visual distinction for non-instructional periods

**PeriodRow**
- Single period display
- Time formatting
- Instructional indicator

---

## Phase 6: Application Entry Point

### 6.1 App Component (`src/App.tsx`)
- State for selected template
- Template selector
- Schedule display
- Basic styling

### 6.2 Entry Point (`src/main.tsx`)
- React 18 createRoot
- Render App component

### 6.3 HTML Template (`index.html`)
- Basic HTML5 structure
- Root div for React
- Vite script reference

---

## File Structure Summary

```
InclusiveScheduleApp/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .gitignore
├── IMPLEMENTATION_PLAN.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── types/
    │   └── index.ts
    ├── data/
    │   └── bellScheduleTemplates.ts
    ├── utils/
    │   └── scheduleUtils.ts
    └── components/
        ├── BellScheduleSelector/
        │   ├── BellScheduleSelector.tsx
        │   └── index.ts
        ├── ScheduleDisplay/
        │   ├── ScheduleDisplay.tsx
        │   ├── PeriodRow.tsx
        │   └── index.ts
        └── common/
            ├── TimeDisplay.tsx
            └── InstructionalBadge.tsx
```

---

## Implementation Order

1. **Project setup** - package.json, configs, directory structure
2. **Types** - Period and BellSchedule interfaces
3. **Data** - createPeriod helper and three templates
4. **Utilities** - Schedule calculation and validation functions
5. **Components** - Build from smallest (common) to largest (selector)
6. **App integration** - Wire everything together
7. **Testing** - Verify templates and calculations

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build tool | Vite | Fast dev server, modern ESM support |
| ID generation | UUID v4 | Unique, collision-resistant |
| Time format | 24-hour "HH:MM" | Unambiguous, easy calculations |
| Instructional tracking | Boolean flag per period | Simple, explicit, compliant |
| Template structure | Exported array | Easy iteration, filtering |

---

## Questions for Clarification

Before implementation, please confirm:

1. **Styling approach?** (CSS modules, Tailwind, styled-components, plain CSS)
2. **State management?** (React useState sufficient, or need Context/Redux?)
3. **Routing needed?** (Single page vs multiple pages)
4. **Testing requirements?** (Unit tests, integration tests, none initially)
5. **Any additional templates** beyond the three specified?

---

## Ready for Implementation

Once you approve this plan, I will proceed to implement the system in the order specified above. Each phase will be committed separately for clear version control.
