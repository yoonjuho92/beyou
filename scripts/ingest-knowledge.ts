/**
 * characters/<slug>/의 md를 읽어 캐릭터를 DB(characters 테이블)에 upsert한다.
 *
 *   characters/<slug>/system.md   프런트매터(slug, name, description) + 본문(성격·말투·설정 전부) → system_prompt
 *   characters/<slug>/fewshot.md  (선택) 본문 = 대화 예시 → few_shot. 파일이 없으면 null로 비운다.
 *
 * 유저별 지식(user_knowledge)은 대화 중에 자동으로 요약·저장되므로 여기서 다루지 않는다.
 *
 *   pnpm ingest          # 모든 캐릭터
 *   pnpm ingest beyou    # 특정 캐릭터만
 */
import { config } from 'dotenv';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

config({ path: ['.env.local', '.env'], quiet: true });

const ROOT = path.resolve('characters');
const SYSTEM_FILE = 'system.md';
const FEW_SHOT_FILE = 'fewshot.md';

async function main() {
  // env를 먼저 로드한 뒤 서버 모듈을 불러온다.
  const { upsertCharacter } = await import('@/lib/characters');

  const only = process.argv.slice(2);
  const dirs: string[] = [];
  for (const name of await readdir(ROOT)) {
    if ((await stat(path.join(ROOT, name))).isDirectory() && (only.length === 0 || only.includes(name))) dirs.push(name);
  }
  if (dirs.length === 0) {
    console.log('인제스트할 캐릭터 폴더가 없습니다.');
    return;
  }

  let failed = 0;
  for (const dir of dirs) {
    const file = path.join(ROOT, dir, SYSTEM_FILE);
    let system: matter.GrayMatterFile<string>;
    try {
      system = matter(await readFile(file, 'utf8'));
    } catch {
      console.error(`✗ characters/${dir}: ${SYSTEM_FILE}이 없습니다.`);
      failed++;
      continue;
    }
    const slug = typeof system.data.slug === 'string' ? system.data.slug : dir;
    const fewShot = await readFile(path.join(ROOT, dir, FEW_SHOT_FILE), 'utf8').then(
      (raw) => matter(raw).content,
      () => null,
    );
    try {
      if (typeof system.data.name !== 'string') throw new Error('프런트매터에 name이 필요합니다.');
      await upsertCharacter({
        slug,
        name: system.data.name,
        description: typeof system.data.description === 'string' ? system.data.description : null,
        systemPrompt: system.content,
        fewShot,
      });
      console.log(
        `✓ characters/${dir} → 캐릭터 '${system.data.name}' (${slug})${fewShot ? ` + ${FEW_SHOT_FILE}` : ''}`,
      );
    } catch (err) {
      console.error(`✗ characters/${dir}/${SYSTEM_FILE}:`, err);
      failed++;
    }
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
