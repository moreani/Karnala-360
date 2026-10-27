Project Name

Virtual360

Objective

Build a premium web-based 360° virtual tour platform inspired by the Birla Aerospace demo.

The application should work entirely in the browser and allow users to freely explore 360° panoramic scenes with smooth transitions and interactive hotspots.

The final output should be deployable as a static website (GitHub Pages / Vercel / Netlify).


Check this
https://lotusmirkaerospace-cloud.github.io/Birla-360/

Tech Stack
Frontend
React 19
Vite
TypeScript
TailwindCSS
Three.js
React Three Fiber
Drei
GSAP
Framer Motion
Utilities
Zustand
React Icons
React Router
react-use
Folder Structure
virtual360/

src/

    components/
        Viewer/
        Hotspot/
        Navbar/
        Compass/
        Loader/
        Minimap/
        Controls/
        Sidebar/
        Modal/

    scenes/

    hooks/

    data/

    assets/

        panoramas/

        icons/

        sounds/

    utils/

    pages/

    App.tsx
Core Features
1. Panorama Viewer

The application should display an equirectangular panorama mapped onto the inside of a sphere.

Requirements

360° horizontal rotation
Vertical look
Zoom
Mouse drag
Touch gestures
Gyroscope support (mobile)
Inertia movement
2. Scene Management

All scenes are stored in JSON.

Example

{
  "id":"karnala-top",
  "title":"Karnala Fort Top",
  "image":"/panoramas/karnala.jpg",
  "initialYaw":25,
  "initialPitch":5,
  "initialFov":75
}
3. Hotspots

Each hotspot contains

{
"id":"next",
"type":"navigation",
"yaw":110,
"pitch":-12,
"target":"scene2",
"icon":"arrow"
}

Supported hotspot types

Navigation
Information
Image popup
Video popup
Website
Audio

Hotspots should animate with a pulsing effect.

4. Scene Transition

When clicking a hotspot

fade out
preload next panorama
fade in

Transition duration

600ms

5. Loading Screen

Before panorama loads

Show

Loading...

██████████

87%

Preload

panorama
hotspot icons
UI
6. Navigation Controls

Top Right

Fullscreen
Sound
Auto Rotate
Reset View

Bottom Left

Scene Name

Bottom Right

Compass
7. Compass

Compass rotates based on camera yaw.

North always remains fixed.

8. Auto Rotate

Idle for 10 seconds

↓

Rotate slowly

↓

Stops immediately when user interacts.

9. Minimap

Small floating minimap.

Current direction shown as

▲
10. Information Popup

Glassmorphism card

Contains

Title

Description

Images

Buttons

11. Keyboard Support

Arrow Keys

Rotate

Mouse Wheel

Zoom

ESC

Exit Fullscreen

12. Mobile Support

Responsive

60 FPS target

Touch gestures

Pinch zoom

Landscape optimized

13. Settings Menu

User can change

Auto Rotate

Sensitivity

Invert Y

FOV

Quality

UI Design

Theme

Dark

Glassmorphism

Rounded corners

Soft shadows

Blur

Modern corporate design

Colors

Background

#101010

Primary

#0EA5E9

Accent

#22C55E

Text

White
Performance

Image preload

Lazy loading

Texture compression

Use WebP where possible

Target

60 FPS desktop

30 FPS mobile

Data Structure
panoramas/

    karnala.jpg

    cave.jpg

    temple.jpg

scenes.json
[
{
"id":"karnala",
"title":"Karnala Fort",
"image":"karnala.jpg",
"hotspots":[]
}
]
Future Features
Multi-floor navigation
Floor selector
Voice narration
Ambient sound
Day/Night mode
Drone panorama support
Guided tour
Measurement tool
Search
Analytics
VR mode
Multi-language
AI tour guide
Deliverables
React source code
TypeScript
Responsive UI
GitHub-ready project
Production build
Documentation
Development Phases
Phase 1 (MVP)
360 panorama viewer
Mouse controls
Zoom
Responsive layout
Loading screen
Phase 2
Hotspots
Scene transitions
Multiple panoramas
Compass
Phase 3
Minimap
Auto rotate
Information popups
Keyboard shortcuts
Phase 4
Performance optimization
Mobile optimization
Polish animations
Production deployment