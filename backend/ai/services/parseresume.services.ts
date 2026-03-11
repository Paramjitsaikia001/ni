import { loadResume } from '../loader/resume.loader';
import { parseResumeChain } from '../chain/parseResume.chain';

export async function parseResume(filePath: string) {
    const resume = await loadResume(filePath);
    const parsedResume = await parseResumeChain(resume);
    return parsedResume;
}