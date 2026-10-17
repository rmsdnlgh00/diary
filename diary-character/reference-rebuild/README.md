# Female character — multi-view reference rebuild

Open `female_reference_rebuild.blend`. The active scene is **Female | multiview reference rebuild**.

- This is a new static character, with a newly modeled face, body, clothing, hands, shoes and caramel bob.
- The eleven supplied images are packed into the blend under **Supplied references | hidden**.
- The previous character remains in the separate **Scene** scene. Preliminary hair experiments are hidden and are not part of the visible model.
- The final visible hair is **Hair | unified caramel bob**, with four thin **rounded swept fringe** patches that follow the scalp. Shirt shoulders use a continuous remeshed surface; cheek blush is shaded directly on the face.
- The new model has no animation rig or transferred walking animation yet. It is not installed in the web game.
- `front-preview.png` is a studio render of the new model.

`scripts/blender/rebuild_reference_female.py` is the initial blocking script. Subsequent hair, facial and shoulder refinements are saved in the blend; the blend is the final editable source.
