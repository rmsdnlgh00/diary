import type { ReactNode } from 'react'
import { Sprite } from '@/components/game/Sprite'
import {
  characterFullBase,
  getCharacterAccessoryAsset,
  getCharacterBodyAsset,
  getCharacterEmotionAsset,
  getCharacterFullAsset,
  getCharacterHairAsset,
  getCharacterOutfitAsset,
} from '@/data/assets'
import { useAssetSrc } from '@/hooks/useAssetReady'
import { ACCESSORIES, BODIES, HAIRS, OUTFITS } from '@/data/characterParts'
import type { AssetMeta, CharacterAppearance, EmotionId } from '@/types'
import { AccessoryLayer, BodyLayer, HairLayer, OutfitLayer } from './CharacterLayers'
import { EmotionFace } from './EmotionFace'
import { RIG } from './rig'

interface Props extends CharacterAppearance {
  emotion: EmotionId
}

/** 레이어 하나. 에셋이 있으면 이미지, 없으면 도형. */
function Layer({
  name,
  asset,
  children,
}: {
  name: string
  asset?: AssetMeta
  children: ReactNode
}) {
  return (
    <div className={`character-sprite__layer character-sprite__layer--${name}`}>
      <Sprite
        asset={asset}
        placeholder={
          <svg className="sprite" viewBox={RIG.viewBox} role="presentation">
            {children}
          </svg>
        }
      />
    </div>
  )
}

/**
 * Body / Outfit / Face / Hair / Accessories 를 각각 독립된 레이어로 쌓는다.
 * 감정이 바뀌면 face 레이어만 교체되고 나머지는 그대로다.
 */
export function CharacterSprite({ emotion, body, hair, outfit, accessories }: Props) {
  // 감정별 그림 → 없으면 기본 전신 그림 → 없으면 레이어 합성
  const emotionSrc = useAssetSrc(getCharacterFullAsset(emotion).src)
  const baseSrc = useAssetSrc(characterFullBase.src)
  const fullSrc = emotionSrc ?? baseSrc
  const skin = BODIES[body]?.color ?? BODIES.body_default.color
  const hairDef = HAIRS[hair] ?? HAIRS.hair_short
  const outfitDef = OUTFITS[outfit] ?? OUTFITS.outfit_tee_blue

  // 감정별 통짜 이미지가 있으면 레이어 합성을 건너뛴다.
  if (fullSrc) {
    return (
      <img
        className="character-sprite character-sprite--full"
        src={fullSrc}
        alt=""
        draggable={false}
        decoding="async"
      />
    )
  }

  return (
    <div className="character-sprite">
      <Layer name="body" asset={getCharacterBodyAsset(body)}>
        <BodyLayer skin={skin} />
      </Layer>

      <Layer name="outfit" asset={getCharacterOutfitAsset(outfit)}>
        <OutfitLayer color={outfitDef.color} accent={outfitDef.accent} bottom={outfitDef.bottom} />
      </Layer>

      <Layer name="face" asset={getCharacterEmotionAsset(emotion)}>
        <EmotionFace emotion={emotion} />
      </Layer>

      <Layer name="hair" asset={getCharacterHairAsset(hair)}>
        <HairLayer style={hairDef.id} color={hairDef.color} />
      </Layer>

      {accessories.map((id) => (
        <Layer key={id} name="accessory" asset={getCharacterAccessoryAsset(id)}>
          <AccessoryLayer ids={[id]} colors={{ [id]: ACCESSORIES[id]?.color ?? '#b189e8' }} />
        </Layer>
      ))}
    </div>
  )
}
