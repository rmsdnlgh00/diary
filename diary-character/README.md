# 여성 캐릭터 원본과 게임 에셋

- `master_female_character.blend`: 사용자가 확정한 master. 체형 수정 실험 이전 버전이며 원본으로 보존합니다.
- `diary_character_clothes_female.blend`: 여성 옷 작업 파일. 몸(`char_female_v3`)은 목을 남자 캐릭터처럼 다시 맞췄고, 고치기 전 메시는 `char_female_v3 before neck fix`로 남아 있습니다(master 좌표). 비교용 남자 캐릭터(x=90)도 들어 있습니다.
- `female-clothes-fitted.glb`: 예전 의상 묶음. 지금 게임은 옷별 파일(`public/assets/clothes/…/<id>/female.glb`)을 씁니다.
- `female_clothes_fit.json`: 의상 맞춤 및 걷기·대기 검증 기록.
- `female-game-20261017/female_character_game.blend`: 삼각형 9,799개인 게임용 작업본. master 메시도 숨긴 상태로 포함합니다.
- `female-game-20261017/verification.json`: 경량화와 텍스처 압축 검증 수치.
- 게임에서 사용하는 최종 파일: `public/assets/characters/female/character-game.glb`.

중간 체형 실험본, 자동 백업, 비교 렌더와 중복 GLB는 제거했습니다. 참고 이미지는 `assets/references/`에 보존합니다.

## 게임 에셋 다시 만들기 (macOS)

게임용 Blender 파일을 열어 `scripts/blender/export_female_game.py`를 실행합니다. 명령행에서는:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background diary-character/female-game-20261017/female_character_game.blend --python scripts/blender/export_female_game.py -- /tmp/female-game-raw.glb
node scripts/optimize-character-textures.mjs /tmp/female-game-raw.glb public/assets/characters/female/character-game.glb
npm run check:female
```

최종 GLB는 2048px 색상 텍스처 두 장을 JPEG 품질 85로 압축합니다. 메시·UV·뼈대·애니메이션의 바이너리 데이터는 그대로 유지합니다. 압축 전 GLB는 임시 파일이므로 저장소에 중복 보관하지 않습니다.

## 여성 옷 내보내기

```sh
# 옷별 GLB: public/assets/clothes/<group>/<kind>/<id>/female.glb
/Applications/Blender.app/Contents/MacOS/Blender --background diary-character/diary_character_clothes_female.blend --python scripts/export-clothes.py -- female
# 옷 아래 피부 숨김 마스크: public/assets/characters/female/body-mask-0.png, body-mask-1.png
/Applications/Blender.app/Contents/MacOS/Blender --background diary-character/diary_character_clothes_female.blend --python scripts/blender/bake_female_body_masks.py
node scripts/check-female.mjs --clothes
```

마스크는 게임용 몸(`char_female_game`)을 게임 파일에서 불러와 계산합니다. 빨강=모든 상의, 초록=모든 하의, 파랑=모든 긴 바지가 덮는 피부이고, 대기·걷기 자세에서 옷을 뚫고 나오는 피부도 포함합니다. 옷 파일의 `Wardrobe preview only` Mask modifier는 Blender 확인용입니다.

## 몸을 고친 뒤 게임용 몸에 옮기기

작업 파일의 몸을 고쳤다면(예: 목) 게임용 몸에 같은 변화량을 옮긴 뒤 게임 에셋과 마스크를 다시 만듭니다.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background diary-character/female-game-20261017/female_character_game.blend --python scripts/blender/sync_female_game_neck.py
```

이 스크립트는 고치기 전 몸과의 차이를 더하므로 한 번만 실행합니다(두 번 돌리면 두 번 움직입니다). 2026-10-18 실행 전 파일은 `female-game-20261017/female_character_game.before-neck-20261018.blend`입니다. 그다음 위의 '게임 에셋 다시 만들기'와 마스크 굽기를 실행합니다.
