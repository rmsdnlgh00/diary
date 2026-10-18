# 옷 다듬기 스크립트 (남녀 동시)

여자 옷 작업 파일 `diary-character/diary_character_clothes_female.blend`에서 남자(비교용, x=90)와 여자 캐릭터의 같은 옷을 함께 다듬고, 남자 원본 `~/male_master_3d/diary_character_clothes.blend`와 게임 파일에 반영하는 스크립트입니다.

대부분 열려 있는 Blender에서 `exec(open(path).read(), {설정})` 형태로 실행합니다. 설정값은 각 파일의 docstring에 있습니다. `apply_to_male_original.py`만 명령행(백그라운드)에서 실행합니다.

모든 스크립트는 고치기 전 메시를 `<메시 이름> before …` 이름으로 파일 안에 남깁니다. 되돌릴 때는 그 메시를 다시 지정하면 됩니다.

## 상의 순서

티셔츠·후드·비옷·잠옷·코트에 사용한 순서입니다.

1. `dress_comparison_male.py` (`ITEM`): 남자 원본의 옷을 비교용 남자에게 입힙니다. 원본 파일은 읽기만 합니다.
2. `rebuild_top.py` (`P_TOP`, `P_SRC`, `P_HEM_Z`, `P_CUFF_X`, …): 남자 옷의 소매·허리·밑단을 깔끔한 원통으로 다시 만듭니다.
3. `smooth_top.py` (`SMOOTH_TEE`, …): 몸판 주름을 크기 변화 없이 다듬습니다.
4. `pattern_uv.py` (`TOP`): 구름 무늬처럼 전체 반복 무늬인 옷만 실행합니다. 몸통과 소매에 같은 크기로 반복되게 UV를 다시 만듭니다.
5. `transfer_top_to_female.py` (`ITEM`): 다듬은 남자 옷을 여자 몸에 맞춰 옮깁니다. 몸과의 간격, 반바지와의 간격, 뼈 가중치를 함께 맞춥니다.
6. `ease_for_game_body.py` (`ITEM`): 게임용 저폴리 몸이 옷을 뚫지 않도록 여자 옷을 살짝 넓힙니다.
7. `attach_parts.py` (`ITEM`, `PARTS`): 단추·주머니·끈·모자를 두 캐릭터의 새 표면에 붙입니다. 예: `{'buttons': 'conform', 'hood': 'hood'}`
8. 작업 파일을 저장합니다.
9. `apply_to_male_original.py`: 남자 원본에 반영합니다. 먼저 원본을 날짜 붙여 백업합니다.

   ```sh
   Blender -b ~/male_master_3d/diary_character_clothes.blend --python scripts/blender/clothes/apply_to_male_original.py -- <item>
   ```
10. 게임 파일 내보내기와 여자 피부 마스크 굽기:

   ```sh
   Blender -b ~/male_master_3d/diary_character_clothes.blend --python scripts/export-clothes.py -- male <item>
   Blender -b diary-character/diary_character_clothes_female.blend --python scripts/export-clothes.py -- female <item>
   Blender -b diary-character/diary_character_clothes_female.blend --python scripts/blender/bake_female_body_masks.py
   ```
11. 게임에서 확인합니다.

   ```sh
   node scripts/shot-outfit.mjs female <item>,denim_shorts,walking_shoes /tmp/shots <이름>
   node scripts/check-female.mjs --clothes
   ```

## 그 밖의 스크립트

- `rebuild_shorts.py`: 반바지의 엉덩이를 다듬고, 다리 밑단과 롤업 단을 다시 만듭니다. 청반바지(남녀)에 사용했습니다.
- `fit_neckline.py`: 상의 목둘레를 기준 목둘레(남자 옷)에 맞춰 자르고 접힌 단을 만듭니다.
- `follow_neck_fix.py`: 여자 몸의 목 수정(`char_female_v3 before neck fix` → 현재)을 예전 몸에 맞춰 만든 옷에 옮깁니다.
