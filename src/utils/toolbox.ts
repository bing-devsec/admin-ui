import type { AxiosResponse } from 'axios';
import http from './axios';

export interface ToolFields {
    name: string;
    description: string;
    url: string;
    enabled: boolean;
}
export interface ToolboxTool extends ToolFields {
    id: string;
    sortOrder: number;
}

interface Result<T> { code: number; message: string; data: T }
const base = '/admin/auth/toolbox';

function read<T>(response: AxiosResponse<Result<T>>): T {
    const { code, message, data } = response.data;
    if (code !== 2000 || message) throw new Error(message || '工具箱请求失败');
    return data;
}

export async function listToolbox() {
    const response = await http.get<Result<{ tools: ToolboxTool[] }>>(`${base}/list`);
    const data = read(response);
    if (!Array.isArray(data?.tools)) throw new Error('当前接口未返回工具列表，请确认后端已更新');
    return data.tools;
}

export async function saveTool(fields: ToolFields, id?: string) {
    return read(id
        ? await http.put<Result<{ id: string }>>(`${base}/tool/update`, { ...fields, id })
        : await http.post<Result<{ id: string }>>(`${base}/tool/add`, fields));
}

export async function reorderTools(ids: string[], previousIds: string[]) {
    read(await http.put<Result<unknown>>(`${base}/reorder`, { ids, previousIds }));
}

export async function deleteTool(id: string) {
    read(await http.delete<Result<unknown>>(`${base}/tool/delete`, { data: { id } }));
}
