# 여성 캐릭터 원본과 게임 에셋

> `.blend` 원본은 용량 때문에 git에 올리지 않습니다(`.gitignore`). 이 폴더와 `~/male_master_3d`는 외장 드라이브나 클라우드에 따로 백업하세요. 게임이 쓰는 GLB·PNG는 `public/assets`에 커밋됩니다.

- `master_female_character.blend`: 사용자가 확정한 master. 체형 수정 실험 이전 버전이며 원본으로 보존합니다.
- `diary_character_clothes_female.blend`: 여성 옷 작업 파일. 몸(`char_female_v3`)은 목을 남자 캐릭터처럼 다시 맞췄고, 고치기 전 메시는 `char_female_v3 before neck fix`로 남아 있습니다(master 좌표). 비교용 남자 캐릭터(x=90)도 들어 있습니다.
- `female-game-20261017/female_character_game.blend`: 삼각형 9,799개인 게임용 작업본. master 메시도 숨긴 상태로 포함합니다.
- `female-game-20261017/verification.json`: 경량화와 텍스처 압축 검증 수치.
- 게임에서 사용하는 최종 파일: `public/assets/characters/female/character-game.glb`.
- 옷 다듬기(남녀 동시) 순서와 스크립트: `scripts/blender/clothes/README.md`.

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
# 옷별 피부 숨김 마스크: public/assets/clothes/…/<id>/female-mask.png (상의·하의)
/Applications/Blender.app/Contents/MacOS/Blender --background diary-character/diary_character_clothes_female.blend --python scripts/blender/bake_female_body_masks.py
node scripts/check-female.mjs --clothes
```

마스크는 게임용 몸(`char_female_game`)을 게임 파일에서 불러와 옷마다 계산합니다. 그 옷이 덮는 피부(빨강=몸 텍스처, 초록=머리 텍스처)이고, 대기·걷기 자세에서 옷을 뚫고 나오는 피부도 포함합니다. 게임은 입은 상의와 하의의 마스크로 그 피부를 그리지 않습니다. 옷을 고치면 마스크도 다시 굽습니다. 옷 파일의 `Wardrobe preview only` Mask modifier는 Blender 확인용입니다.

## 몸을 고친 뒤 게임용 몸에 옮기기

작업 파일의 몸을 고쳤다면(예: 목) 게임용 몸에 같은 변화량을 옮긴 뒤 게임 에셋과 마스크를 다시 만듭니다.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background diary-character/female-game-20261017/female_character_game.blend --python scripts/blender/sync_female_game_neck.py
```

이 스크립트는 고치기 전 몸과의 차이를 더하므로 한 번만 실행합니다(두 번 돌리면 두 번 움직입니다). 실행 전에 게임용 Blender 파일을 날짜 붙여 복사해 두세요. 그다음 위의 '게임 에셋 다시 만들기'와 마스크 굽기를 실행합니다.
