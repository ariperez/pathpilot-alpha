# PathPilot Naming & File Organization Improvement Plan

## Current State Analysis

### Recent Changes Observed
- The app has already undergone some refactoring:
  - `PatientIntelligenceGrid` has been split into `PatientList` and `PatientIntelligenceContent`
  - New components added: `AnalysisStatus`, `ErrorBoundary`, `HealthStatus`, `LoadingSkeletons`
  - New lib files: `analysis-cache.ts`, `medical-analysis.ts`
  - The main page now uses server-side rendering with proper data fetching
  - API route now supports pagination (`page`, `pageSize` params)

### Current Issues with Naming

#### 1. **"Intelligence" Terminology**
- **Problem**: Overused and doesn't accurately describe medical functionality
- **Found in**:
  - `/api/patient-intelligence/route.ts`
  - `PatientIntelligenceContent.tsx`
  - `PatientWithIntelligence` interface
  - `PatientIntelligenceResponse` interface
  - "Intelligence Grid" references in UI text

#### 2. **"Command Center" Terminology**
- **Problem**: Overly dramatic, not medical-standard
- **Found in**:
  - `PatientLabCommandCenter.tsx` component
  - Previously in UI titles (appears to be partially fixed)

#### 3. **Inconsistent Component Organization**
- Components are all in flat `/components` directory
- App-level components mixed with page components

## Proposed Improvements

### 1. Naming Changes

#### API Routes
```
Current → Proposed
/api/patient-intelligence → /api/patients/overview
                           OR /api/patients/summary
```

#### Components
```
Current → Proposed
PatientIntelligenceContent → PatientOverviewContent
PatientLabCommandCenter → PatientLabDetail
```

#### Interfaces/Types
```
Current → Proposed
PatientWithIntelligence → PatientWithRiskData
PatientIntelligenceResponse → PatientOverviewResponse
```

#### UI Text
```
Current → Proposed
"Intelligence Grid" → "Patient Dashboard"
"PathPilot Intelligence Command Center" → "PathPilot Clinical Dashboard"
"Lab Intelligence Companion" → "Lab Results Dashboard"
```

### 2. File Organization

```
pathpilot-alpha/
├── app/
│   ├── api/
│   │   ├── patients/                    # Group patient APIs
│   │   │   ├── overview/
│   │   │   │   └── route.ts            # Renamed from patient-intelligence
│   │   │   └── [id]/
│   │   │       └── labs/
│   │   │           └── route.ts        # Patient-specific lab data
│   │   └── fhir/
│   │       └── [...path]/
│   │           └── route.ts
│   ├── patients/                        # Rename from "patient"
│   │   └── [id]/
│   │       └── page.tsx
│   ├── page.tsx                         # Main dashboard
│   ├── PatientOverviewContent.tsx       # Renamed
│   └── PatientList.tsx                  # Keep as-is
│
├── components/
│   ├── patients/                        # Patient-specific components
│   │   ├── PatientHeader.tsx
│   │   ├── PatientLabDetail.tsx        # Renamed from PatientLabCommandCenter
│   │   └── PatientOverview.tsx         # If needed
│   ├── labs/                            # Lab-related components
│   │   ├── LabDashboard.tsx
│   │   ├── LabCard.tsx
│   │   ├── LabTrendChart.tsx
│   │   └── CriticalAlerts.tsx
│   ├── analysis/                        # Analysis & status components
│   │   ├── AnalysisStatus.tsx
│   │   └── HealthStatus.tsx
│   └── shared/                          # Common/utility components
│       ├── ErrorBoundary.tsx
│       ├── LoadingSkeletons.tsx
│       └── Breadcrumbs.tsx
│
└── lib/
    ├── api/                              # API utilities
    │   └── fhir-client.ts
    ├── analysis/                         # Analysis utilities
    │   ├── analysis-cache.ts
    │   ├── medical-analysis.ts
    │   └── risk-calculator.ts
    ├── processors/                       # Data processing
    │   └── lab-processor.ts
    └── types/
        └── index.ts                      # Renamed from types.ts

```

### 3. Implementation Priority

#### Phase 1: Critical Naming Changes (High Priority)
1. Rename API route `/api/patient-intelligence` → `/api/patients/overview`
2. Update all "Intelligence" references in UI text
3. Rename `PatientLabCommandCenter` → `PatientLabDetail`

#### Phase 2: Type/Interface Updates (Medium Priority)
1. Rename `PatientWithIntelligence` → `PatientWithRiskData`
2. Rename `PatientIntelligenceResponse` → `PatientOverviewResponse`
3. Rename `PatientIntelligenceContent` → `PatientOverviewContent`

#### Phase 3: File Organization (Lower Priority)
1. Create subdirectories in `/components`
2. Move components to appropriate subdirectories
3. Reorganize `/lib` directory structure

### 4. Search & Replace Guide

#### Global Find & Replace Operations
```bash
# Step 1: Update API route references
Find: /api/patient-intelligence
Replace: /api/patients/overview

# Step 2: Update type names
Find: PatientWithIntelligence
Replace: PatientWithRiskData

Find: PatientIntelligenceResponse
Replace: PatientOverviewResponse

# Step 3: Update component names
Find: PatientIntelligenceContent
Replace: PatientOverviewContent

Find: PatientLabCommandCenter
Replace: PatientLabDetail

# Step 4: Update UI text
Find: "Intelligence Grid"
Replace: "Patient Dashboard"

Find: "Intelligence Command Center"
Replace: "Clinical Dashboard"
```

### 5. Testing After Changes

After implementing naming changes, verify:
1. All imports are updated correctly
2. API endpoints are functioning
3. Navigation between pages works
4. No TypeScript errors
5. UI displays correct text

### 6. Benefits of These Changes

1. **Clarity**: Names directly describe functionality
2. **Professionalism**: Medical-standard terminology
3. **Maintainability**: Better organized file structure
4. **Scalability**: Clear patterns for adding new features
5. **Developer Experience**: Easier to find and understand code

### 7. Alternative Naming Considerations

If "overview" doesn't feel right, consider these alternatives:

- `/api/patients/summary` - More concise
- `/api/patients/dashboard` - UI-focused
- `/api/patients/risk-assessment` - Specific to risk functionality
- `PatientRiskDashboard` - Instead of `PatientOverviewContent`
- `PatientSummary` - Instead of `PatientWithRiskData`

### 8. Notes on Current Code Quality

**Positive aspects to preserve:**
- Good separation of concerns (server/client components)
- Proper error handling
- Use of TypeScript interfaces
- Caching mechanisms in place

**Areas that could benefit from renaming:**
- Remove dramatic terminology
- Use industry-standard medical terms
- Improve clarity of component purposes