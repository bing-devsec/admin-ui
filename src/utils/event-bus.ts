import mitt, { type Emitter } from 'mitt';

// 全局事件类型表：在这里集中维护各事件名 -> payload 类型的映射
export interface UpdateArticlePayload {
    id: string | number;
    title: string;
    tag: string;
    content: string;
    describe: string;
}

export type AppEvents = {
    updateArticle: UpdateArticlePayload;
};

const emitter: Emitter<AppEvents> = mitt<AppEvents>();
export default emitter;
