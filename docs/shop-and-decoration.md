# 상점과 꾸미기 시스템

기존 Zustand store와 `haru-village:v1` 저장 키를 확장한다. 새 라이브러리는 추가하지 않는다.

## 사용 방법

- 상점: 캐릭터/공간 탭에서 구매. 초기 재화는 기존과 같은 100코인이다. 중복 구매와 잔액 부족을 차단한다.
- 캐릭터 꾸미기: 현재 보고 있는 달의 날짜를 선택하고, 보유 아이템을 슬롯별로 장착하거나 해제한다. 같은 의상을 여러 날짜의 캐릭터에 사용할 수 있다.
- 공간 꾸미기: 보유 아이템을 고르고 잔디를 클릭한다. 배치된 아이템을 선택해 이동 또는 회수한다. 이동 취소는 원래 자리를 유지한다.
- 한 종류는 한 달에 하나 배치할 수 있다. 회수는 구매 취소가 아니며 소유권은 유지된다. 다른 달에는 같은 아이템을 새로 배치할 수 있다.
- 상단 화살표로 월을 변경한다. 날짜는 브라우저의 로컬 날짜이며, 새 달에 앱을 열거나 열린 앱에서 달이 변경되면 새 마을로 전환한다.
- 기존 일기, 감정 분석, 랜덤 이동, 배경, 하단 메뉴는 유지한다. 새 달의 배경 에셋이 없으면 기존 9월 배경을 재사용한다.

## 저장 형식

저장 키는 `haru-village:v1` 그대로이며 내부 `version`은 2다. 버전 1도 읽고 빠진 필드를 보완한다. 다음 저장 때 전체 데이터를 버전 2로 기록한다.

```ts
{
  version: 2,
  diaries: DiaryEntry[],
  characters: Array<DiaryCharacterData & { equippedItems: EquippedItems }>,
  coins: number,
  inventory: { clothes: string[], decorations: string[] },
  worldDecorations: {
    '2026-09': [{ id: 'placed_...', itemId: 'flower_pot', x: 0.5, y: 0.55 }],
    '2026-10': []
  },
  worldId: '2026-09',       // 현재 보고 있는 달
  calendarMonth: '2026-09'  // 마지막으로 확인한 실제 달
}
```

장식물 좌표는 기존 월드와 동일한 **0~1 비율**이다. `0.5`는 50%다. 코인, 인벤토리, 장착, 일기, 월별 배치는 같은 저장 함수로 함께 저장한다. UI 선택, 편집 도구, 안내 문구와 매 프레임의 이동 위치는 저장하지 않는다. 저장 공간 부족 등 쓰기 실패는 화면에 표시한다.

## 아이템과 에셋

공통 카탈로그는 `src/data/items.ts`에 있다. 의상 9종, 장식물 7종을 등록했다. 아이템 ID는 저장 데이터에서 참조하므로 출시 후에는 유지해야 한다.

```text
src/assets/character/
  master/                # 기존 원본
  turnaround/            # 방향별 기준 그림 준비용
  walk/                  # 기존 걷기 원본
  expressions/           # 기존 표정
  clothes/
    hats/ tops/ bottoms/ shoes/ bags/ accessories/
src/assets/decorations/
  plants/ furniture/ outdoor/ misc/
```

`assetPath`에 `/src/assets/character/clothes/tops/hoodie_gray.webp` 또는 `/src/assets/decorations/plants/flower_pot.png`처럼 지정하면 Vite 빌드에 포함된다. `public/assets`를 쓴다면 `/assets/...`로 지정한다. `@/assets/...`와 `src/assets/...` 표기도 지원한다. 소스 에셋을 추가한 뒤에는 다시 빌드한다.

빈 경로나 로드할 수 없는 이미지는 이모지 placeholder로 대체된다. `assetPath`만 바꾸면 상품 카드, 보유 목록, 장착 배지와 배치 장식물에 반영된다. 장식물은 투명 배경, 바닥 중앙을 기준으로 한 이미지를 권장한다. 크기는 `worldWidth`로 조절한다.

현재 캐릭터는 옷을 포함한 통짜 스프라이트다. **장착은 저장되고 즉시 배지로 표시되지만, 몸의 옷 자체가 바뀌지는 않는다.** 실제 의상 렌더링 연결 지점은 `CharacterEquipment.tsx`다. 몸에 옷을 겹쳐 표시하려면 기본 몸체와 방향/프레임별 의상 레이어를 준비하고, 기존 `WalkingCharacter`의 프레임 및 앵커 좌표에 맞춘 렌더러를 이 연결 지점에 추가해야 한다. 정적인 상품 이미지 한 장만으로 걷는 의상 레이어를 대신할 수는 없다.

## 배치와 확장

`decorationSystem.ts`는 기존 월드의 `walkableAreas`와 `blockedAreas`를 재사용한다. `PLACEMENT_BLOCKED_AREAS`에 상점, 다리, 하단 UI 제한을 따로 두었으며, 바닥 면적과 다른 배치 장식물의 겹침도 검사한다. 배치 장식물은 y 좌표 기준으로 캐릭터와 함께 깊이 정렬된다.

현재 클릭 배치만 지원한다. 장식물이 캐릭터의 보행 경로를 막는 추가 충돌은 적용하지 않아 기존 이동 시스템을 유지한다. 향후 방향별 의상 에셋, 드래그 배치, 아이템별 바닥 면적, 재화 획득 규칙을 확장할 수 있다.

## 검증

- `npm run build`: TypeScript 검사와 프로덕션 빌드.
- `npm run check:game`: 임시 Chrome과 로컬 Vite 서버에서 저장 이전, 구매, 6개 의상 슬롯, 날짜별 분리, 배치/이동/회수, 금지 영역, 새로고침, 월 전환, 기존 일기/이동, 에셋 누락, 저장 실패를 검증한다.
- Chrome 자동 탐색이 안 되면 `CHROME_PATH` 환경변수로 실행 파일을 지정한다. 테스트는 사용자 브라우저 프로필이나 실제 저장 데이터를 사용하지 않는다. 화면 캡처는 시스템 임시 폴더에 남긴다.
