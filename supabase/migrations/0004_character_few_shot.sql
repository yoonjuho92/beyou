-- 0004_character_few_shot: 캐릭터 대화 예시(characters/<slug>/fewshot.md)를 system_prompt와 함께 저장한다.
-- 채팅 시 시스템 프롬프트의 [대화 예시] 섹션으로 들어간다. 파일이 없으면 null.

alter table characters add column if not exists few_shot text;
