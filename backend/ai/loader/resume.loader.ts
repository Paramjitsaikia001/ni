import {PDFLoader} from "@langchain/community/document_loaders/fs/pdf";

export async function loadResume(filePath: string) {
    const loader= new PDFLoader(filePath);

    const docs = await loader.load();

    const result = docs.map(doc =>doc.pageContent).join("\n");

    return result;
}