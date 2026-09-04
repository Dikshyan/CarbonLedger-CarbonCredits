I already have an existing CarbonLedger frontend project with a working Home page and Header/Navbar.

DO NOT create a new frontend project.
DO NOT change the existing project structure unnecessarily.
DO NOT replace my existing Home page.
DO NOT rewrite existing components unless required.
First inspect the existing frontend structure and understand how routing, Header, Home, styling, and components are currently implemented.

My goal is to add a new page called:

"AI Environmental Explorer"

This page will be the frontend interface for CarbonLedger's AI/remote-sensing system.

--------------------------------------------------
1. ADD A ROUTE TO THE EXISTING APPLICATION
--------------------------------------------------

Add a new route:

/ai-explorer

The existing Home page should remain the default route:

/

Add "AI Explorer" to the existing Header/Navbar.

Example:

CarbonLedger | Home | AI Explorer | About | Login

The "AI Explorer" navigation item should navigate to:

/ai-explorer

Use the routing system already present in the project. If React Router is already installed, use it. Do not introduce another routing library unnecessarily.

The existing Header design must remain consistent with the rest of the website.

--------------------------------------------------
2. CREATE THE AI EXPLORER PAGE
--------------------------------------------------

Create:

src/pages/AIExplorer.jsx

Use the existing styling system of the project.

If the project uses CSS files, follow that system.
If it uses Tailwind, use Tailwind.
If it uses another UI system, follow the existing implementation.

Do not introduce a completely different design language.

--------------------------------------------------
3. PURPOSE OF THE PAGE
--------------------------------------------------

The page is an interactive environmental intelligence map.

The user should be able to:

1. Search or navigate to a geographical location.
2. Select an area on the map.
3. Click multiple points to create a polygon.
4. Edit or clear the polygon.
5. See the selected area.
6. Calculate the selected area's approximate area.
7. Confirm the area.
8. Eventually send the polygon coordinates to the Django backend.
9. Django will forward the geometry to the CarbonLedger FastAPI AI service.
10. The AI service will use Google Earth Engine and Sentinel-2 imagery.
11. Results will eventually be returned to the frontend.
12. The frontend will visualize the results.

The architecture must be:

Frontend
    ↓
Django Backend
    ↓
FastAPI AI Service
    ↓
Google Earth Engine
    ↓
Sentinel-2
    ↓
AI / Remote Sensing Analysis
    ↓
FastAPI
    ↓
Django
    ↓
Frontend

The frontend must NOT communicate directly with Google Earth Engine.

--------------------------------------------------
4. MAP TECHNOLOGY
--------------------------------------------------

Use:

- MapLibre GL JS
- Terra Draw
- Turf.js
- GeoJSON

Install dependencies using pnpm.

Use:

pnpm add maplibre-gl terra-draw maplibre-gl-terradraw @turf/turf

Do not use Google Maps API.

The map should be the main visual element of the page.

--------------------------------------------------
5. MAP DESIGN
--------------------------------------------------

I do NOT want a generic GIS dashboard.

I want a modern, premium, climate-tech/environmental-intelligence interface.

Think:

"Modern Google Maps + climate-tech dashboard + satellite analysis"

The interface should be simple enough for a normal user who has no GIS or remote-sensing knowledge.

The map should occupy most of the screen.

Use floating UI cards instead of a large permanent sidebar.

Avoid:

- Huge sidebars
- Complicated GIS controls
- Too many buttons
- Technical terminology everywhere
- Generic admin-dashboard design
- Excessive gradients
- Excessive animations

Use:

- Clean typography
- Rounded cards
- Floating controls
- Clear hierarchy
- Subtle shadows
- Smooth transitions
- Large readable metrics
- Minimal controls
- Professional environmental aesthetic

--------------------------------------------------
6. INITIAL PAGE
--------------------------------------------------

When the user first opens:

/ai-explorer

Show:

Header
    CarbonLedger
    Home
    AI Explorer
    About
    Login

Then the map.

Place a floating search box on the map:

"Search a location"

Place a floating instruction card:

"Explore an area's environmental potential"

"Select an area on the map and let CarbonLedger AI analyze it."

Add a primary button:

"Select Area"

--------------------------------------------------
7. AREA SELECTION
--------------------------------------------------

When the user clicks:

"Select Area"

enable polygon drawing using Terra Draw.

Display a small instruction:

"Click points on the map to define your area."

The user should be able to:

- Click multiple points
- Create a polygon
- Finish the polygon
- Edit the polygon
- Delete the polygon
- Start again

The selected polygon should be visually clear.

Use a clean translucent fill with a visible border.

Do not use overly bright or distracting colors.

--------------------------------------------------
8. GEOJSON
--------------------------------------------------

Once the polygon is created, convert it into valid GeoJSON.

Example:

{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [91.7000, 26.1000],
        [91.7500, 26.1000],
        [91.7500, 26.1500],
        [91.7000, 26.1500],
        [91.7000, 26.1000]
      ]
    ]
  }
}

IMPORTANT:

GeoJSON coordinates must always use:

[longitude, latitude]

NOT:

[latitude, longitude]

Do not hardcode coordinates.

The coordinates must come from the polygon selected by the user.

--------------------------------------------------
9. AREA CALCULATION
--------------------------------------------------

Use Turf.js to calculate the selected polygon's area.

Display:

Selected Area

Example:

42.7 km²

and:

4,270 hectares

The values must be calculated dynamically from the polygon.

Do not hardcode them.

--------------------------------------------------
10. AREA CONFIRMATION CARD
--------------------------------------------------

After the user finishes drawing the polygon, show a floating card:

Area selected

42.7 km²
4,270 hectares

Buttons:

[ Edit Area ]

[ Clear ]

[ Analyze Area ]

Do not call the backend yet.

For this first implementation, the "Analyze Area" button can simply store/log the generated GeoJSON and show a mock analysis state.

--------------------------------------------------
11. API ARCHITECTURE
--------------------------------------------------

Create a separate service file:

src/services/analysisApi.js

Do NOT put API requests directly inside AIExplorer.jsx.

Prepare a function such as:

analyzeArea(geojson)

The future Django endpoint will be something like:

POST /api/projects/analyze

Request:

{
  "project_id": "CL-001",
  "boundary": {
    "type": "Polygon",
    "coordinates": [...]
  }
}

For now, use a placeholder/mock API implementation if the backend endpoint does not exist yet.

Clearly separate:

MAP LOGIC
from
API LOGIC

--------------------------------------------------
12. FUTURE AI RESULTS
--------------------------------------------------

The current CarbonLedger Version 1 AI service produces results like:

{
  "status": "success",
  "satellite": "Sentinel-2",
  "ndvi": {
    "min": -0.0347,
    "mean": 0.396,
    "max": 0.7945
  },
  "vegetation": {
    "threshold": 0.4,
    "area_hectares": 1353.03
  },
  "carbon": {
    "estimated_tonnes": 338256.86
  }
}

These are example values only.

Do not hardcode these values into the actual analysis.

Design the UI so that real backend values can be inserted later.

--------------------------------------------------
13. RESULTS PANEL
--------------------------------------------------

After analysis, the page should eventually show a floating bottom results panel.

Example:

ANALYSIS COMPLETE

Vegetation Area
1,353 ha

Mean NDVI
0.396

Estimated Carbon
338,256 t

Then:

Satellite
Sentinel-2

Monitoring Period
2025

Add:

"View Technical Details"

The technical section can show:

Satellite:
Sentinel-2

Processing:
Google Earth Engine

NDVI:
(NIR - Red) / (NIR + Red)

Vegetation threshold:
NDVI > 0.4

Carbon methodology:
MVP fixed carbon-density assumption

--------------------------------------------------
14. CARBON POTENTIAL VISUALIZATION
--------------------------------------------------

The long-term goal is to visually show areas with higher estimated carbon-storage potential.

Prepare the map architecture for future layers:

- Satellite imagery
- Vegetation
- NDVI
- Mangrove probability
- Carbon potential

Create a simple layer-control UI.

Example:

MAP LAYERS

○ Standard
○ Satellite
○ Vegetation
○ NDVI
○ Carbon Potential

Only activate layers that have actual data.

Do not fake a carbon heatmap using random data.

For the current MVP, the carbon result is an area-level estimate and should NOT be represented as a verified pixel-level carbon map.

--------------------------------------------------
15. CARBON DISCLAIMER
--------------------------------------------------

The current Version 1 carbon calculation is:

Carbon =
Vegetation Area × Carbon Density

Current MVP carbon density:

250 tonnes/hectare

This is only an MVP estimate.

It is NOT:

- Certified carbon stock
- Verified carbon credits
- A final MRV result

Clearly label the UI:

"Estimated Carbon — MVP"

Add an information tooltip:

"Current carbon values are prototype estimates based on an assumed carbon density. The methodology will be improved and validated in future versions."

--------------------------------------------------
16. LOADING EXPERIENCE
--------------------------------------------------

When the user starts analysis, show a professional loading state.

Example:

Analyzing selected area...

Retrieving satellite imagery
Processing vegetation
Calculating environmental indicators
Estimating carbon

Do not fake real backend progress.

If there is no progress API, use an indeterminate loading animation and descriptive status text.

--------------------------------------------------
17. ERROR HANDLING
--------------------------------------------------

Handle:

- Invalid polygon
- Polygon too small
- Polygon too large
- Invalid GeoJSON
- Network error
- Backend unavailable
- AI service unavailable
- No satellite imagery
- Analysis timeout

Show user-friendly messages.

Never expose raw Python, Django, FastAPI, or Google Earth Engine errors.

Example:

"CarbonLedger couldn't analyze this area right now. Please try again."

--------------------------------------------------
18. RESPONSIVE DESIGN
--------------------------------------------------

The interface should work on:

- Desktop
- Laptop
- Tablet

Desktop is the primary target.

On smaller screens:

- Floating cards should become bottom sheets.
- Controls should remain accessible.
- The map should remain the primary element.
- Avoid horizontal overflow.

--------------------------------------------------
19. COMPONENT STRUCTURE
--------------------------------------------------

Use reusable components where appropriate.

Possible structure:

src/
├── components/
│   ├── Header.jsx                 [existing - do not unnecessarily modify]
│   ├── CarbonMap.jsx
│   ├── MapToolbar.jsx
│   ├── LocationSearch.jsx
│   ├── AreaSelectionCard.jsx
│   ├── AnalysisPanel.jsx
│   ├── AnalysisLoader.jsx
│   ├── MapLayerControl.jsx
│   ├── MapLegend.jsx
│   └── TechnicalDetails.jsx
│
├── pages/
│   ├── Home.jsx                   [existing]
│   └── AIExplorer.jsx             [new]
│
├── services/
│   └── analysisApi.js             [new]
│
└── utils/
    └── geoJson.js                 [new if useful]

Do not create unnecessary files.

Follow the existing project conventions.

--------------------------------------------------
20. IMPORTANT EXISTING PROJECT RULE
--------------------------------------------------

Before making changes:

1. Inspect the existing package.json.
2. Inspect the existing App.jsx.
3. Inspect the existing Header component.
4. Inspect the existing Home page.
5. Inspect the existing CSS/design system.
6. Inspect how routes are currently configured.

Then integrate the AI Explorer into the existing application.

Do NOT replace existing functionality.

Do NOT create duplicate Header components.

Do NOT create a second React application.

Do NOT restructure the repository unless absolutely necessary.

--------------------------------------------------
21. FIRST IMPLEMENTATION SCOPE
--------------------------------------------------

For this implementation, focus ONLY on the frontend.

Implement:

✓ AI Explorer route
✓ Header navigation
✓ MapLibre map
✓ Terra Draw polygon selection
✓ Polygon editing
✓ Polygon deletion
✓ Turf.js area calculation
✓ GeoJSON generation
✓ Selected-area confirmation UI
✓ Clean custom UI
✓ Responsive layout
✓ Mock analysis state
✓ analysisApi.js preparation

Do NOT implement:

✗ Google Earth Engine in frontend
✗ AI model in frontend
✗ Carbon calculation in frontend
✗ Direct frontend → FastAPI communication
✗ Direct frontend → Google Earth Engine communication
✗ Fake carbon heatmap
✗ Fake satellite analysis

The frontend should be ready to connect to the Django backend later.

--------------------------------------------------
22. FINAL USER EXPERIENCE
--------------------------------------------------

The entire experience should feel like:

1. User opens AI Explorer.
2. User searches for a place.
3. User clicks "Select Area".
4. User draws an area.
5. CarbonLedger shows the selected area and its size.
6. User clicks "Analyze Area".
7. A professional analysis/loading state appears.
8. Eventually the backend returns the AI analysis.
9. CarbonLedger displays vegetation, NDVI, and estimated carbon.
10. The map can eventually display spatial environmental/carbon layers.

The primary message should be:

"Select a place. Let CarbonLedger analyze it. Understand its environmental and carbon potential."

Build this as a polished production-quality feature integrated into my EXISTING frontend, not as a standalone demo application.