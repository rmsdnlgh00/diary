import { ACCESSORIES, BODIES, HAIRS, OUTFITS } from '@/data/characterParts'
import type { CharacterAppearance, EmotionId } from '@/types'
import { AccessoryLayer, BodyLayer, HairLayer, OutfitLayer } from './CharacterLayers'
import { EmotionFace } from './EmotionFace'
import { RIG } from './rig'

interface Props extends CharacterAppearance {
  emotion: EmotionId
}

/**
 * 레이어 합성 캐릭터.
 * Body / Face / Hair / Outfit / Accessories 를 각각 독립적으로 교체할 수 있다.
 */
export function CharacterSprite({ emotion, body, hair, outfit, accessories }: Props) {
  const skin = BODIES[body]?.color ?? BODIES.body_default.color
  const hairDef = HAIRS[hair] ?? HAIRS.hair_short
  const outfitDef = OUTFITS[outfit] ?? OUTFITS.outfit_tee_blue
  const accessoryColors = Object.fromEntries(
    Object.values(ACCESSORIES).map((item) => [item.id, item.color]),
  )

  return (
    <svg className="character-sprite" viewBox={RIG.viewBox} role="presentation">
      <g className="character-layer character-layer--body">
        <BodyLayer skin={skin} />
      </g>
      <g className="character-layer character-layer--outfit">
        <OutfitLayer color={outfitDef.color} accent={outfitDef.accent} />
      </g>
      <g className="character-layer character-layer--face">
        <EmotionFace emotion={emotion} />
      </g>
      <g className="character-layer character-layer--hair">
        <HairLayer style={hairDef.id} color={hairDef.color} />
      </g>
      <g className="character-layer character-layer--accessories">
        <AccessoryLayer ids={accessories} colors={accessoryColors} />
      </g>
    </svg>
  )
}
