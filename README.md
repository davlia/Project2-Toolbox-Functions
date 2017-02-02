# [Project2: Toolbox Functions](https://github.com/CIS700-Procedural-Graphics/Project2-Toolbox-Functions)

## Overview
Animated bird wing using Three.js and dat.GUI.

## Features
- Wing controls
  - Bezier control points
- Feather controls
  - length
  - width
  - distribution (density)
  - layers
  - color
- Wind controls
  - Wind speed
  - Wind directions (wind always blows in the +z axis, but you can control x and y directions to modulate feather orientation)
- Wing Controls
  - Flapping speed
  - Flapping motion
    - 5 Keyframes

## The Bird Wing
The wing itself is segmented into 3 sections and 3 layers (modifiable). These sections spawn off of a "bone" cubic Bezier curve. These sections represent the primary, secondary, and tertiary feathers that the bird uses to guide itself, give itself thrust, and stay warm respectively. The added layers gives the wing some density and thickness to make it realistic. The primary feathers is splayed using a power curve as well as a LERP. The rotation along the y-axis as the feathers extend outward uses a LERP as well. The secondary feathers, also use LERPs as well as a parabolic curve for added realism (referencing a wing photo). Finally, the scapular or tertiary wings use a cubic pulse as we can best control the falloff of the curve. The feathers are sampled regularly depending on the layer. The higher layers are more sparse but compensate by being wider (z-axis scaling).

## Cool Things
Try turning the wind on and raise flapping speed to ~6-8 to see a flapping wing! Note the Bezier controls are reactive to the position of the wing. Two functions help us achieve this: a `diff` function that calculates the keyframe delta with an added alpha parameter to modulate step-sizes (for keyframe interpolation), and a `moveWingTo`/`moveWing` function that moves the wing using Bezier control points in an absolute/relative fashion.


## Future work
- Rotational and Scale Keyframes
- Feather shaders
- More anatomically correct wing
- Smoother keyframe interpolations
