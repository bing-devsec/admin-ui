import type { LanguageRegistration } from 'shiki';
import { bundledLanguages } from 'shiki';

const thriftLanguage: LanguageRegistration = {
    name: 'thrift',
    displayName: 'Thrift IDL',
    scopeName: 'source.thrift',
    aliases: ['idl', 'thrift-idl', 'apache-thrift'],
    patterns: [
        { include: '#comments' },
        { include: '#strings' },
        { include: '#annotations' },
        { include: '#declarations' },
        { include: '#keywords' },
        { include: '#types' },
        { include: '#fieldIds' },
        { include: '#constants' },
        { include: '#numbers' },
    ],
    repository: {
        comments: {
            patterns: [
                { name: 'comment.line.double-slash.thrift', match: '//.*$' },
                { name: 'comment.line.number-sign.thrift', match: '#.*$' },
                { name: 'comment.block.thrift', begin: '/\\*', end: '\\*/' },
            ],
        },
        strings: {
            patterns: [
                {
                    name: 'string.quoted.double.thrift',
                    begin: '"',
                    end: '"',
                    patterns: [{ name: 'constant.character.escape.thrift', match: '\\\\(?:[\\\\"/bfnrt]|u[0-9a-fA-F]{4})' }],
                },
                {
                    name: 'string.quoted.single.thrift',
                    begin: "'",
                    end: "'",
                    patterns: [{ name: 'constant.character.escape.thrift', match: "\\\\(?:[\\\\'bfnrt]|u[0-9a-fA-F]{4})" }],
                },
            ],
        },
        annotations: {
            patterns: [{ name: 'entity.other.attribute-name.thrift', match: '@[A-Za-z_][A-Za-z0-9_]*' }],
        },
        declarations: {
            patterns: [
                {
                    name: 'meta.declaration.thrift',
                    match: '\\b(enum|exception|service|struct|union)\\s+([A-Za-z_][A-Za-z0-9_.]*)',
                    captures: {
                        1: { name: 'storage.type.thrift' },
                        2: { name: 'entity.name.type.thrift' },
                    },
                },
                {
                    name: 'meta.const.thrift',
                    match: '\\b(const)\\s+([A-Za-z_][A-Za-z0-9_.<>]*)\\s+([A-Za-z_][A-Za-z0-9_]*)',
                    captures: {
                        1: { name: 'storage.modifier.thrift' },
                        2: { name: 'support.type.thrift' },
                        3: { name: 'constant.other.thrift' },
                    },
                },
                {
                    name: 'meta.namespace.thrift',
                    match: '\\b(namespace)\\s+([A-Za-z_*][A-Za-z0-9_.*-]*)\\s+([A-Za-z_][A-Za-z0-9_.]*)',
                    captures: {
                        1: { name: 'keyword.control.thrift' },
                        2: { name: 'entity.name.namespace.target.thrift' },
                        3: { name: 'entity.name.namespace.thrift' },
                    },
                },
                {
                    name: 'meta.include.thrift',
                    match: "\\b(include|cpp_include)\\s+(\"[^\"]+\"|'[^']+')",
                    captures: {
                        1: { name: 'keyword.control.import.thrift' },
                        2: { name: 'string.quoted.thrift' },
                    },
                },
                {
                    name: 'meta.function.thrift',
                    match: '\\b([A-Za-z_][A-Za-z0-9_.<>]*)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(?=\\()',
                    captures: {
                        1: { name: 'support.type.thrift' },
                        2: { name: 'entity.name.function.thrift' },
                    },
                },
            ],
        },
        keywords: {
            patterns: [
                {
                    name: 'keyword.control.thrift',
                    match:
                        '\\b(?:as|async|extends|include|namespace|oneway|throws|typedef|xsd_all|xsd_attrs|xsd_namespace|xsd_nillable|xsd_optional)\\b',
                },
                { name: 'storage.modifier.thrift', match: '\\b(?:optional|required)\\b' },
            ],
        },
        types: {
            patterns: [
                {
                    name: 'support.type.primitive.thrift',
                    match: '\\b(?:binary|bool|byte|double|i16|i32|i64|list|map|set|string|void)\\b',
                },
            ],
        },
        fieldIds: {
            patterns: [
                {
                    name: 'meta.field-id.thrift',
                    match: '(^|\\s)([0-9]+)(:)',
                    captures: {
                        2: { name: 'constant.numeric.field-id.thrift' },
                        3: { name: 'punctuation.separator.key-value.thrift' },
                    },
                },
            ],
        },
        constants: {
            patterns: [
                { name: 'constant.language.thrift', match: '\\b(?:false|true)\\b' },
                { name: 'constant.other.thrift', match: '\\b[A-Z][A-Z0-9_]*\\b' },
            ],
        },
        numbers: {
            patterns: [{ name: 'constant.numeric.thrift', match: '\\b-?(?:0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b' }],
        },
    },
};

const plantUmlLanguage: LanguageRegistration = {
    name: 'plantuml',
    displayName: 'PlantUML',
    scopeName: 'source.plantuml',
    aliases: ['puml'],
    patterns: [
        { include: '#comments' },
        { include: '#strings' },
        { include: '#directives' },
        { include: '#keywords' },
        { include: '#arrows' },
        { include: '#numbers' },
    ],
    repository: {
        comments: {
            patterns: [
                { name: 'comment.line.apostrophe.plantuml', match: "'.*$" },
                { name: 'comment.block.plantuml', begin: "/'", end: "'/" },
            ],
        },
        strings: {
            patterns: [
                {
                    name: 'string.quoted.double.plantuml',
                    begin: '"',
                    end: '"',
                    patterns: [{ name: 'constant.character.escape.plantuml', match: '\\\\.' }],
                },
            ],
        },
        directives: {
            patterns: [{ name: 'keyword.control.directive.plantuml', match: '@(?:start|end)[A-Za-z0-9_]*\\b' }],
        },
        keywords: {
            patterns: [
                {
                    name: 'keyword.control.plantuml',
                    match:
                        '\\b(?:activate|alt|as|autonumber|box|break|case|class|create|critical|database|deactivate|destroy|else|elseif|end|endif|endwhile|entity|enum|footer|group|header|hide|if|interface|legend|loop|namespace|newpage|note|opt|package|participant|queue|repeat|return|skinparam|start|stop|title|while)\\b',
                },
                {
                    name: 'storage.type.plantuml',
                    match: '\\b(?:actor|boundary|collections|component|control|database|entity|interface|participant|queue)\\b',
                },
            ],
        },
        arrows: {
            patterns: [{ name: 'keyword.operator.arrow.plantuml', match: '[-.=]+(?:>|>>|x|o)?|(?:<|<<)[-.=]+' }],
        },
        numbers: {
            patterns: [{ name: 'constant.numeric.plantuml', match: '\\b\\d+(?:\\.\\d+)?\\b' }],
        },
    },
};

const graphvizLanguage: LanguageRegistration = {
    name: 'dot',
    displayName: 'Graphviz DOT',
    scopeName: 'source.dot',
    aliases: ['graphviz', 'gv'],
    patterns: [
        { include: '#comments' },
        { include: '#strings' },
        { include: '#keywords' },
        { include: '#attributes' },
        { include: '#operators' },
        { include: '#constants' },
        { include: '#numbers' },
    ],
    repository: {
        comments: {
            patterns: [
                { name: 'comment.line.double-slash.dot', match: '//.*$' },
                { name: 'comment.line.number-sign.dot', match: '#.*$' },
                { name: 'comment.block.dot', begin: '/\\*', end: '\\*/' },
            ],
        },
        strings: {
            patterns: [
                {
                    name: 'string.quoted.double.dot',
                    begin: '"',
                    end: '"',
                    patterns: [{ name: 'constant.character.escape.dot', match: '\\\\.' }],
                },
            ],
        },
        keywords: {
            patterns: [
                { name: 'keyword.control.dot', match: '\\b(?:digraph|edge|graph|node|strict|subgraph)\\b' },
                { name: 'storage.modifier.dot', match: '\\b(?:cluster)_[A-Za-z0-9_]+\\b' },
            ],
        },
        attributes: {
            patterns: [
                {
                    name: 'support.type.property-name.dot',
                    match:
                        '\\b(?:arrowhead|arrowsize|arrowtail|color|constraint|dir|fillcolor|fontcolor|fontname|fontsize|height|label|margin|rank|rankdir|shape|style|tooltip|width)\\b(?=\\s*=)',
                },
            ],
        },
        operators: {
            patterns: [{ name: 'keyword.operator.arrow.dot', match: '--|->|=' }],
        },
        constants: {
            patterns: [{ name: 'constant.language.dot', match: '\\b(?:false|true)\\b' }],
        },
        numbers: {
            patterns: [{ name: 'constant.numeric.dot', match: '\\b\\d+(?:\\.\\d+)?\\b' }],
        },
    },
};

const customLanguages: Record<string, LanguageRegistration> = {
    thrift: thriftLanguage,
    plantuml: plantUmlLanguage,
    dot: graphvizLanguage,
};

const languageAliases: Record<string, string> = {
    idl: 'thrift',
    'thrift-idl': 'thrift',
    'apache-thrift': 'thrift',

    puml: 'plantuml',
    uml: 'plantuml',

    graphviz: 'dot',
    gv: 'dot',

    golang: 'go',
    node: 'javascript',
    nodejs: 'javascript',
    javascriptreact: 'jsx',
    typescriptreact: 'tsx',

    mysql: 'sql',
    mariadb: 'sql',
    mssql: 'sql',
    postgres: 'sql',
    postgresql: 'sql',
    psql: 'sql',
    sqlite: 'sql',
    sqlite3: 'sql',
    tsql: 'sql',

    pb: 'proto',

    conf: 'ini',
    config: 'ini',
    cfg: 'ini',
    env: 'dotenv',

    'shell-session': 'shellsession',
    shellsession: 'shellsession',

    cplusplus: 'cpp',
    objectivec: 'objective-c',

    compose: 'yaml',
    'docker-compose': 'yaml',

    plain: 'text',
    plaintext: 'text',
    txt: 'text',
};

const plainTextLanguages = new Set(['text', 'plain', 'plaintext', 'txt']);

export function normalizeCodeFenceLanguage(lang: string): string {
    const normalized = lang.trim().toLowerCase();
    return languageAliases[normalized] ?? normalized;
}

export function getCustomShikiLanguage(lang: string): LanguageRegistration | undefined {
    return customLanguages[lang];
}

export function isBundledShikiLanguage(lang: string): lang is keyof typeof bundledLanguages {
    return lang in bundledLanguages;
}

export function isPlainTextShikiLanguage(lang: string): boolean {
    return plainTextLanguages.has(lang);
}
