# 이미지 스프라이트 넣는 법

코드로 그린 캐릭터 대신 직접 만든(또는 구한) PNG 그림을 쓸 수 있습니다. 파일을 넣지 않으면 지금처럼 코드 그림이 나옵니다.

1. 캐릭터마다 **스프라이트 시트 PNG** 한 장을 만듭니다. 한 장 안에 같은 크기의 프레임이 왼쪽 위부터 가로로 나열된 형태입니다
   (예: 64×96 프레임 8칸 → 512×96 이미지). 캐릭터는 **오른쪽을 보는 모습**으로 그리고, 발이 프레임 아래끝에 닿게 합니다.
   배경은 투명(PNG 알파).
2. 파일을 이 폴더(`game/assets/`)에 넣습니다. 예: `player.png`, `worker.png`, `bear.png`.
3. `sprites.json`에서 해당 항목의 `"file": null`을 `"file": "player.png"`처럼 바꾸고, 프레임 크기와 애니메이션 프레임 번호를 맞춥니다.
   - `anims.idle` 서 있을 때, `walk` 걸을 때(2~4프레임), `work` 벌목·낚시·망치질·공격할 때, `attack` 곰이 물 때, `down` 쓰러졌을 때
   - `scale` 로 크기를 맞춥니다. 사람 키는 월드 기준 약 70, 곰은 약 60, 설인은 약 150입니다 (프레임 높이 × scale ≈ 그 값).
4. 새로고침하면 적용됩니다. 설정이 틀리면 그 캐릭터만 코드 그림으로 돌아갑니다.

무료 에셋: Kenney.nl(Toon Characters, Animal Pack), itch.io "pixel art character sprite sheet" 검색, OpenGameArt.org.
AI 그림 도구로 만들 때는 "sprite sheet, side view, transparent background, 8 frames walk cycle" 같은 조건을 쓰면 됩니다.
