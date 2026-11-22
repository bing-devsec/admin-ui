import { mountHtmlEmbeds } from './htmlEmbed/player';

export function mountAdminHtmlEmbeds(root: ParentNode): () => void {
    // The admin site's access gateway uses same-origin cookies when serving the source document.
    return mountHtmlEmbeds(root, id => '/api/user/article/html-embed/' + id, 'same-origin');
}
