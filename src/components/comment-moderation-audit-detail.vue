<template>
    <div class="audit-detail">
        <div class="audit-meta-panel">
            <div><span>原始机审状态</span><strong><el-tag :type="statusTagType(row.status)" effect="light">{{ statusText(row.status) }}</el-tag></strong></div>
            <div><span>原始风险分值</span><strong>{{ row.riskScore }}</strong></div>
            <div><span>决策代码</span><strong>{{ moderationDecisionText(row.decision) }}</strong></div>
            <div><span>审计记录</span><strong>{{ meta.auditID || row.auditID || '-' }}</strong></div>
            <div><span>审计来源</span><strong>{{ meta.source === 'live_comment' ? '真实评论' : '审核模拟' }}</strong></div>
            <div><span>策略快照</span><strong class="mono">{{ meta.policyVersion || '-' }}</strong></div>
            <div><span>执行时间</span><strong>{{ formatEvaluatedAt(meta.evaluatedAt) }}</strong></div>
            <div><span>输入上下文</span><strong :title="executionContextText(meta.context)">{{ executionContextText(meta.context) }}</strong></div>
            <div><span>行为检测</span><strong>{{ behaviorStatusText(row.trace?.behavior) }}</strong></div>
        </div>

        <section class="audit-section decision-section">
            <h3>最终决策链</h3>
            <div class="decision-flow-list">
                <div v-for="stage in decisionFlowStages" :key="stage.key" class="decision-flow-item" :class="`is-${stage.state}`">
                    <div class="decision-flow-marker"></div>
                    <div class="decision-flow-main">
                        <div class="decision-flow-heading">
                            <strong>{{ stage.title }}</strong>
                            <el-tag :type="stageTagType(stage.state)" size="small" effect="light">{{ stage.badge }}</el-tag>
                        </div>
                        <p>{{ statusText(stage.snapshot.status) }} · 分值 {{ stage.snapshot.score }} · {{ moderationDecisionText(stage.snapshot.decision) }}</p>
                        <span>{{ stage.description }}</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="audit-section behavior-section">
            <h3>行为检测执行情况</h3>
            <el-alert
                v-if="!row.trace.behavior || row.trace.behavior.status !== 'executed'"
                :closable="false"
                :type="row.trace.behavior?.status === 'skipped' ? 'info' : 'warning'"
                show-icon
                :title="behaviorStatusText(row.trace.behavior)" />
            <el-table v-if="row.trace.behavior?.metrics?.length" :data="row.trace.behavior.metrics" size="small">
                <el-table-column label="指标" min-width="130"><template #default="scope">{{ behaviorMetricText(scope.row.name) }}</template></el-table-column>
                <el-table-column label="执行" width="66"><template #default="scope">{{ scope.row.evaluated ? '是' : '否' }}</template></el-table-column>
                <el-table-column label="未执行原因" min-width="140"><template #default="scope">{{ scope.row.evaluated ? '-' : behaviorMetricReasonText(scope.row.skippedReason) }}</template></el-table-column>
                <el-table-column label="已有" width="66"><template #default="scope">{{ scope.row.evaluated ? scope.row.observedCount : '-' }}</template></el-table-column>
                <el-table-column label="计入本条" width="80"><template #default="scope">{{ scope.row.evaluated ? scope.row.prospectiveCount : '-' }}</template></el-table-column>
                <el-table-column label="窗口" width="82"><template #default="scope">{{ durationText(scope.row.windowSeconds) }}</template></el-table-column>
                <el-table-column prop="reviewThreshold" label="待审阈值" width="80" />
                <el-table-column label="拒绝阈值" width="80"><template #default="scope">{{ scope.row.blockThreshold || '-' }}</template></el-table-column>
                <el-table-column label="触发" width="82"><template #default="scope">{{ scope.row.triggeredLevel ? moderationLevelText(scope.row.triggeredLevel) : '未触发' }}</template></el-table-column>
            </el-table>
        </section>

        <section class="audit-section">
            <h3>评论正文</h3>
            <p class="full-content">{{ row.content }}</p>
        </section>

        <section v-if="row.reasons?.length" class="audit-section reasons-section">
            <h3>机审原因</h3>
            <div class="chip-list"><span v-for="reason in row.reasons" :key="reason">{{ reason }}</span></div>
            <details v-if="row.rawReasons?.length"><summary>查看原始原因代码</summary><code v-for="reason in row.rawReasons" :key="reason">{{ reason }}</code></details>
        </section>

        <section v-if="row.trace?.decisionEngine" class="audit-section engine-section">
            <h3>概率决策链路</h3>
            <div class="summary-grid">
                <div><span>融合风险</span><strong>{{ probabilityText(row.trace.decisionEngine.decision.riskProbability) }}</strong></div>
                <div><span>决策置信度</span><strong>{{ probabilityText(row.trace.decisionEngine.decision.confidence) }}</strong></div>
                <div><span>校准版本</span><strong>{{ row.trace.decisionEngine.decision.calibration }}</strong></div>
                <div><span>融合动作</span><strong>{{ probabilityApplicationText(row.trace.decisions.probability) }}</strong></div>
            </div>
            <el-alert
                v-if="row.trace.decisionEngine.decision.fallbackReason"
                :closable="false"
                type="info"
                show-icon
                :title="fallbackReasonText(row.trace.decisionEngine.decision.fallbackReason)" />
            <div v-if="probabilityEntries.length" class="probability-list">
                <span v-for="item in probabilityEntries" :key="item.category">{{ moderationCategoryText(item.category) }} {{ probabilityText(item.probability) }}</span>
            </div>

            <h4>分类融合计算</h4>
            <div class="threshold-list">
                <span>通过 ≤ {{ probabilityText(row.trace.decisionEngine.fusion.thresholds.approveMax) }}</span>
                <span>拒绝 ≥ {{ probabilityText(row.trace.decisionEngine.fusion.thresholds.rejectMin) }}</span>
                <span>最低语境置信度 {{ probabilityText(row.trace.decisionEngine.fusion.thresholds.minConfidence) }}</span>
            </div>
            <el-table v-if="row.trace.decisionEngine.fusion.categories?.length" :data="row.trace.decisionEngine.fusion.categories" size="small">
                <el-table-column label="分类" min-width="110"><template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template></el-table-column>
                <el-table-column label="规则风险" width="82"><template #default="scope">{{ probabilityText(scope.row.ruleRisk) }}</template></el-table-column>
                <el-table-column label="语境风险" width="82"><template #default="scope">{{ scope.row.contextCovered ? probabilityText(scope.row.contextRisk) : '-' }}</template></el-table-column>
                <el-table-column label="行为风险" width="82"><template #default="scope">{{ probabilityText(scope.row.behaviorRisk) }}</template></el-table-column>
                <el-table-column label="反证扣减" width="82"><template #default="scope">{{ probabilityText(scope.row.counterEvidence) }}</template></el-table-column>
                <el-table-column label="最终风险" width="82"><template #default="scope"><strong>{{ probabilityText(scope.row.finalRisk) }}</strong></template></el-table-column>
            </el-table>

            <h4>候选还原（保留原文，不做强制替换）</h4>
            <el-table v-if="row.trace.decisionEngine.candidates?.length" :data="row.trace.decisionEngine.candidates" size="small">
                <el-table-column prop="clauseID" label="分句" width="64"><template #default="scope">{{ scope.row.clauseID || '全局' }}</template></el-table-column>
                <el-table-column prop="observed" label="原文片段" min-width="110" show-overflow-tooltip />
                <el-table-column label="方法" min-width="130"><template #default="scope">{{ rewriteMethodText(scope.row.method) }}</template></el-table-column>
                <el-table-column label="分类" min-width="110"><template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template></el-table-column>
                <el-table-column label="关系角色" width="92"><template #default="scope">{{ rewriteRoleText(scope.row.role) }}</template></el-table-column>
                <el-table-column prop="text" label="候选文本" min-width="190" show-overflow-tooltip />
                <el-table-column label="置信度" width="86"><template #default="scope">{{ probabilityText(scope.row.confidence) }}</template></el-table-column>
                <el-table-column label="歧义" width="66"><template #default="scope">{{ scope.row.ambiguous ? '有' : '无' }}</template></el-table-column>
                <el-table-column prop="rationale" label="说明" min-width="190" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="没有生成候选文本" :image-size="52" />

            <h4>去重后的证据</h4>
            <el-table v-if="row.trace.decisionEngine.evidence?.length" :data="row.trace.decisionEngine.evidence" size="small">
                <el-table-column prop="clauseID" label="分句" width="64"><template #default="scope">{{ scope.row.clauseID || '全局' }}</template></el-table-column>
                <el-table-column label="来源" min-width="92"><template #default="scope">{{ moderationSourceText(scope.row.source) }}</template></el-table-column>
                <el-table-column label="分类" min-width="105"><template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template></el-table-column>
                <el-table-column label="方向" width="66"><template #default="scope">{{ scope.row.polarity === 'negative' ? '反证' : '风险' }}</template></el-table-column>
                <el-table-column label="强度" width="76"><template #default="scope">{{ probabilityText(scope.row.confidence) }}</template></el-table-column>
                <el-table-column prop="value" label="证据" min-width="150" show-overflow-tooltip />
                <el-table-column prop="ruleID" label="规则 ID" min-width="130" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="没有风险证据" :image-size="52" />
            <div v-if="row.trace.decisionEngine.fusion.deduplicated?.length" class="dedup-note">
                输入 {{ row.trace.decisionEngine.fusion.inputCount }} 条证据，保留 {{ row.trace.decisionEngine.fusion.outputCount }} 条，去重 {{ row.trace.decisionEngine.fusion.deduplicated.length }} 条。
            </div>
            <el-table v-if="row.trace.decisionEngine.fusion.deduplicated?.length" :data="row.trace.decisionEngine.fusion.deduplicated" size="small" class="dedup-table">
                <el-table-column prop="discarded.id" label="丢弃证据" min-width="96" />
                <el-table-column prop="discarded.value" label="证据内容" min-width="150" show-overflow-tooltip />
                <el-table-column label="强度" width="76"><template #default="scope">{{ probabilityText(scope.row.discarded.confidence) }}</template></el-table-column>
                <el-table-column prop="keptID" label="保留证据" min-width="96" />
                <el-table-column label="原因" min-width="150"><template #default="scope">{{ dedupReasonText(scope.row.reason) }}</template></el-table-column>
            </el-table>

            <h4>本地上下文分析</h4>
            <div v-if="row.trace.decisionEngine.context.analyzed" class="context-card">
                <p>进程内分析 · 置信度 {{ probabilityText(row.trace.decisionEngine.context.confidence) }} · 良性概率 {{ probabilityText(row.trace.decisionEngine.context.benignProbability) }}</p>
                <p v-if="row.trace.decisionEngine.context.intent">意图：{{ moderationIntentText(row.trace.decisionEngine.context.intent) }}</p>
                <p v-if="row.trace.decisionEngine.context.explanation">说明：{{ row.trace.decisionEngine.context.explanation }}</p>
            </div>
            <el-alert v-else :closable="false" type="warning" show-icon :title="fallbackReasonText(row.trace.decisionEngine.context.unavailableReason || 'context_analyzer_unavailable')" />

            <h4>本地分析原始证据</h4>
            <el-table v-if="row.trace.decisionEngine.context.evidence?.length" :data="row.trace.decisionEngine.context.evidence" size="small">
                <el-table-column prop="clauseID" label="分句" width="64"><template #default="scope">{{ scope.row.clauseID || '全局' }}</template></el-table-column>
                <el-table-column label="分类" min-width="105"><template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template></el-table-column>
                <el-table-column label="方向" width="66"><template #default="scope">{{ scope.row.polarity === 'negative' ? '反证' : '风险' }}</template></el-table-column>
                <el-table-column label="强度" width="76"><template #default="scope">{{ probabilityText(scope.row.confidence) }}</template></el-table-column>
                <el-table-column prop="value" label="证据" min-width="150" show-overflow-tooltip />
                <el-table-column prop="correlationGroup" label="相关组" min-width="190" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="本地分析没有生成额外证据" :image-size="52" />

            <h4>分句关系（行动与评价立场）</h4>
            <el-table v-if="row.trace.decisionEngine.context.relations?.length" :data="row.trace.decisionEngine.context.relations" size="small">
                <el-table-column prop="clauseID" label="分句" width="64" />
				<el-table-column label="类型" width="82"><template #default="scope">{{ relationTypeText(scope.row.type) }}</template></el-table-column>
                <el-table-column prop="subject" label="主体" min-width="90" show-overflow-tooltip />
                <el-table-column prop="action" label="动作" min-width="90" show-overflow-tooltip />
                <el-table-column prop="object" label="对象" min-width="120" show-overflow-tooltip />
				<el-table-column prop="predicate" label="判断谓词" min-width="100" show-overflow-tooltip />
                <el-table-column prop="result" label="结果" min-width="130" show-overflow-tooltip />
				<el-table-column label="立场" min-width="100"><template #default="scope">{{ relationStanceText(scope.row.stance) }}</template></el-table-column>
                <el-table-column label="分类" min-width="105"><template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template></el-table-column>
                <el-table-column label="关系子类型" min-width="140"><template #default="scope">{{ relationSubtypeText(scope.row.subtype) }}</template></el-table-column>
                <el-table-column prop="evidence" label="关系证据" min-width="140" show-overflow-tooltip />
                <el-table-column label="作用域" min-width="180"><template #default="scope">
                    <el-tag v-if="scope.row.negated" type="success" size="small">已否定</el-tag>
                    <el-tag v-if="scope.row.quoted" type="info" size="small">引用</el-tag>
                    <el-tag v-if="scope.row.reported" type="info" size="small">转述</el-tag>
					<el-tag v-if="scope.row.inferred" type="warning" size="small">含推断</el-tag>
                    <span v-if="!scope.row.negated && !scope.row.quoted && !scope.row.reported && !scope.row.inferred">直接表达</span>
                </template></el-table-column>
                <el-table-column label="置信度" width="86"><template #default="scope">{{ probabilityText(scope.row.confidence) }}</template></el-table-column>
            </el-table>
            <el-empty v-else description="没有形成完整关系" :image-size="52" />
        </section>

        <section class="audit-section">
            <h3>语义分句</h3>
            <div v-if="row.trace?.clauses?.length" class="clause-list">
                <div v-for="clause in row.trace.clauses" :key="clause.id"><span>片段 {{ clause.id }}</span><p>{{ clause.text.raw }}</p></div>
            </div>
            <el-empty v-else description="没有分句信息" :image-size="52" />
        </section>

        <section class="audit-section">
            <div class="section-header">
                <h3>审核信号流水线</h3>
                <el-radio-group v-model="signalStage" size="small">
                    <el-radio-button label="detector">原始 {{ row.trace?.detectorSignals?.length || 0 }}</el-radio-button>
                    <el-radio-button label="suppressed">已抑制 {{ row.trace?.suppressedSignals?.length || 0 }}</el-radio-button>
                    <el-radio-button label="final">最终 {{ row.signals?.length || 0 }}</el-radio-button>
                </el-radio-group>
            </div>
            <el-table v-if="selectedSignalRows.length" :data="selectedSignalRows" size="small">
                <el-table-column prop="clauseID" label="片段" width="66"><template #default="scope">{{ scope.row.clauseID || '全局' }}</template></el-table-column>
                <el-table-column label="来源" min-width="92"><template #default="scope">{{ moderationSourceText(scope.row.source) }}</template></el-table-column>
                <el-table-column label="分类" min-width="110"><template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template></el-table-column>
                <el-table-column label="等级" min-width="92"><template #default="scope">{{ moderationLevelText(scope.row.level) }}</template></el-table-column>
                <el-table-column prop="score" label="分值" width="64" />
                <el-table-column prop="ruleID" label="规则 ID" min-width="140" show-overflow-tooltip />
                <el-table-column prop="evidence" label="证据" min-width="150" show-overflow-tooltip />
                <el-table-column label="原因" min-width="190" show-overflow-tooltip><template #default="scope">{{ scope.row.reasonText || scope.row.reason || '-' }}</template></el-table-column>
            </el-table>
            <el-empty v-else :description="emptySignalStageText" :image-size="52" />
        </section>

        <section class="audit-section">
            <h3>文本归一化</h3>
            <div class="text-grid">
                <div><span>原文</span><p>{{ row.text.raw || '-' }}</p></div>
                <div><span>归一化</span><p>{{ row.text.normalized || '-' }}</p></div>
                <div><span>紧凑文本</span><p>{{ row.text.compact || '-' }}</p></div>
                <div><span>混淆骨架</span><p>{{ row.text.confusable || '-' }}</p></div>
                <div v-if="row.text.decodedTexts?.length"><span>解码文本</span><p>{{ row.text.decodedTexts.join('\n') }}</p></div>
            </div>
        </section>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { ModerationAuditMeta, ModerationDecisionSnapshot, ModerationPreviewRow } from '../types/comment-moderation';

const props = defineProps<{ row: ModerationPreviewRow; meta: ModerationAuditMeta }>();
const signalStage = ref<'detector' | 'suppressed' | 'final'>('final');

const selectedSignalRows = computed(() => {
    if (signalStage.value === 'detector') return props.row.trace.detectorSignals || [];
    if (signalStage.value === 'suppressed') return props.row.trace.suppressedSignals || [];
    return props.row.signals || [];
});
const emptySignalStageText = computed(() => signalStage.value === 'detector' ? '探测器没有产生信号' : signalStage.value === 'suppressed' ? '没有被语义抑制的信号' : '最终没有风险信号');
const probabilityEntries = computed(() => Object.entries(props.row.trace.decisionEngine?.decision.categoryProbabilities || {})
    .map(([category, probability]) => ({ category, probability }))
    .sort((left, right) => right.probability - left.probability));

const statusText = (status: string) => status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '待审核';
const statusTagType = (status: string) => status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
const probabilityText = (value?: number) => `${((value || 0) * 100).toFixed(2)}%`;
const formatEvaluatedAt = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
};
const durationText = (seconds?: number) => !seconds ? '-' : seconds % 86400 === 0 ? `${seconds / 86400} 天` : seconds % 3600 === 0 ? `${seconds / 3600} 小时` : seconds % 60 === 0 ? `${seconds / 60} 分钟` : `${seconds} 秒`;
const behaviorStatusText = (trace?: ModerationPreviewRow['trace']['behavior']) => !trace ? '没有行为检测记录' : trace.status === 'executed' ? (trace.readOnly ? '已只读执行，未写入行为统计' : '已执行') : trace.status === 'skipped' ? '上下文不足，已跳过' : trace.status === 'unavailable' ? '行为存储不可用' : '行为数据查询失败';
const labelText = (labels: Record<string, string>, value?: string, empty = '-') => value ? labels[value] || value : empty;
const behaviorMetricText = (name: string) => labelText({ user_frequency: '用户评论频率', ip_frequency: 'IP 评论频率', duplicate_content: '完全重复内容', near_duplicate: '近似重复内容' }, name);
const behaviorMetricReasonText = (reason?: string) => labelText({ user_id_not_provided: '未提供用户 ID', client_ip_not_provided: '未提供客户端 IP', user_or_article_not_provided: '需要同时提供用户 ID 和文章 ID', near_duplicate_disabled: '近重复规则已停用' }, reason);
const moderationLevelText = (level?: string) => labelText({ allow: '放行', notice: '提示', review: '待复核', block: '拒绝' }, level);
const moderationSourceText = (source?: string) => labelText({ lexicon: '敏感词库', structure: '结构规则', context: '上下文规则', behavior: '行为风险', semantic: '语义修正', similarity: '相似度检测', local_context: '本地上下文' }, source);
const moderationCategoryText = (category?: string) => labelText({ abuse: '辱骂攻击', benign_context: '良性语境', contact: '联系方式导流', decoded_url: '编码外链', drugs: '毒品风险', gambling: '赌博', gore: '血腥内容', hate: '仇恨排斥', harmful_value: '有害价值观', illegal_privacy: '违法与隐私', minor: '未成年人风险', political: '政治动员', risk_phrase: '风险短语', script_injection: '脚本注入', sensitive: '敏感风险', sexual: '色情低俗', spam_fraud: '垃圾与欺诈', text_quality: '文本质量', url: '外链风险', violence: '暴力威胁' }, category);
const rewriteMethodText = (method?: string) => labelText({ exact: '精确匹配', emoji_annotation: 'Emoji 概念', pinyin_homophone: '拼音同音', confusable_skeleton: '形似字符', edit_distance: '近似文本', local_context: '本地上下文' }, method);
const rewriteRoleText = (role?: string) => labelText({ subject: '对象词', predicate: '动作词', concept: '风险概念' }, role);
const dedupReasonText = (reason?: string) => labelText({ stronger_correlated_evidence: '同一相关组中存在更强证据', weaker_correlated_evidence: '强度不高于已保留证据' }, reason);
const moderationIntentText = (intent?: string) => labelText({ actionable: '可执行风险行为', rejection: '拒绝风险行为', reporting: '引用或转述', risk_education: '风险科普', risk_evaluation: '风险评价', question: '询问', technical: '技术讨论', content_criticism: '内容批评', harmful_incitement: '有害行为诱导', self_harm_expression: '自伤意图表达', targeted_abuse: '定向辱骂', unknown: '未确定' }, intent);
const relationTypeText = (type?: string) => labelText({ action: '行动', evaluation: '评价', expression: '表达' }, type);
const relationStanceText = (stance?: string) => labelText({ actionable: '实施/推广', condemnation: '谴责', warning: '警示', rejection: '拒绝', reporting: '转述', self_concern: '自我风险' }, stance);
const relationSubtypeText = (subtype?: string) => labelText({ self_harm_encouragement: '诱导自伤', dangerous_behavior_encouragement: '教唆危险行为', death_wish: '死亡诅咒', self_harm_expression: '自伤意图表达', risk_prevention: '危险行为劝阻', risk_education: '风险科普反证', stance_evaluation: '风险评价反证' }, subtype);
const moderationDecisionText = (decision?: string) => labelText({ evidence_baseline_reject: '证据基线拒绝', evidence_baseline_review: '证据基线复核', evidence_baseline_allow: '证据基线通过', probability_allow: '概率通过', probability_review: '概率复核', probability_reject: '概率拒绝', human_feedback_exact: '精确内容反馈覆盖', human_feedback_relation: '关系样本反馈覆盖' }, decision);
const fallbackReasonText = (reason?: string) => labelText({ context_analysis_disabled: '本地上下文分析已停用，保留证据基线结果', context_analysis_error: '本地上下文分析失败，保留证据基线结果', context_analyzer_unavailable: '本地上下文分析器不可用，保留证据基线结果', context_analysis_unavailable: '本地上下文分析不可用，保留证据基线结果', context_confidence_below_threshold: '本地分析置信度未达到接管阈值，保留证据基线结果', hard_safety_signal: '硬安全信号禁止降级' }, reason);
const feedbackReasonText = (reason?: string) => labelText({ feedback_store_unavailable: '反馈存储不可用', feedback_lookup_failed: '反馈策略查询失败', no_matching_feedback: '没有命中历史人工反馈', feedback_no_consensus: '已有反馈尚未形成多数共识', feedback_support_below_minimum: '关系反馈支持样本不足', feedback_status_invalid: '反馈目标状态无效', hard_safety_signal: '硬安全信号禁止降级' }, reason, '');
const snapshotChanged = (before?: ModerationDecisionSnapshot, after?: ModerationDecisionSnapshot) => Boolean(before && after && (before.status !== after.status || before.score !== after.score || before.decision !== after.decision));
const probabilityApplicationText = (stage: ModerationPreviewRow['trace']['decisions']['probability']) => !stage?.evaluated ? '未评估' : !stage.applied ? '已评估，未接管' : snapshotChanged(stage.before, stage.after) ? '已接管并改变结果' : '已接管，结果相同';
const executionContextText = (context?: ModerationAuditMeta['context']) => {
    if (!context) return '未记录';
    const values: string[] = [];
    if (context.userID) values.push(`用户 ${context.userID}`);
    if (context.articleID) values.push(`文章 ${context.articleID}`);
    if (context.clientIPProvided) values.push('客户端 IP');
    if (context.articleTitleProvided) values.push('文章标题');
    if (context.articleCategoryProvided) values.push('文章分类');
    if (context.parentContentProvided) values.push('父评论');
    if (context.replyContentProvided) values.push('被回复评论');
    return values.length ? values.join('、') : '未提供额外上下文';
};

type StageState = 'baseline' | 'changed' | 'retained' | 'checked' | 'blocked' | 'error' | 'waiting' | 'skipped' | 'final';
const stageTagType = (state: StageState) => state === 'changed' ? 'success' : state === 'blocked' || state === 'error' ? 'danger' : state === 'waiting' ? 'warning' : state === 'final' ? 'primary' : 'info';
const decisionFlowStages = computed(() => {
    const flow = props.row.trace.decisions;
    if (!flow) return [{ key: 'final', title: '最终结果', state: 'final' as StageState, badge: '最终结果', snapshot: { status: props.row.status, score: props.row.riskScore, decision: props.row.decision }, description: '当前响应没有结构化决策链。' }];
    const probability = flow.probability;
    const hard = flow.hardSafety;
    const feedback = flow.feedback;
    const probabilityChanged = probability.applied && snapshotChanged(probability.before, probability.after);
    const feedbackChanged = feedback.applied && snapshotChanged(feedback.before, feedback.after);
    const feedbackFailed = feedback.reason === 'feedback_lookup_failed' || feedback.reason === 'feedback_store_unavailable';
    const feedbackStats = feedback.matched ? `${feedback.scope === 'exact' ? '精确内容' : '关系指纹'}反馈：支持 ${feedback.support}/${feedback.total}，冲突 ${feedback.conflicts}；模拟 ${feedback.simulationSupport}，真实 ${feedback.liveSupport}` : '';
    const feedbackReason = feedbackReasonText(feedback.reason);
    return [
        { key: 'rule', title: '证据基线', state: 'baseline' as StageState, badge: '基线结果', snapshot: flow.rule, description: '探测器信号经过去重、分句语义抑制和统一证据校准后形成的上下文无关结果。' },
        { key: 'probability', title: '证据融合', state: (!probability.evaluated ? 'skipped' : probability.applied ? probabilityChanged ? 'changed' : 'retained' : 'checked') as StageState, badge: !probability.evaluated ? '未评估' : probability.applied ? probabilityChanged ? '已接管 · 已改变' : '已接管 · 结果相同' : '已评估 · 未接管', snapshot: probability.after?.status ? probability.after : probability.before, description: probability.applied ? probabilityChanged ? `把结果从“${statusText(probability.before.status)}”调整为“${statusText(probability.after.status)}”。` : '已接管，但结果与证据基线相同。' : fallbackReasonText(probability.reason) },
        { key: 'hard', title: '硬安全保护', state: (hard.triggered ? 'blocked' : hard.evaluated ? 'checked' : 'skipped') as StageState, badge: hard.triggered ? '已触发 · 阻断降级' : hard.evaluated ? '已检查 · 未触发' : '未检查', snapshot: hard.after?.status ? hard.after : probability.after, description: hard.triggered ? `命中 ${hard.ruleID || '硬安全规则'}，禁止低风险结果覆盖原拒绝。` : hard.evaluated ? '已完成不可降级规则检查，没有触发。' : '本次没有执行硬安全检查。' },
        { key: 'feedback', title: '人工反馈策略', state: (feedbackFailed ? 'error' : !feedback.evaluated ? 'skipped' : feedback.applied ? feedbackChanged ? 'changed' : 'retained' : feedback.matched ? feedback.reason === 'hard_safety_signal' ? 'blocked' : 'waiting' : 'checked') as StageState, badge: feedbackFailed ? '查询失败' : !feedback.evaluated ? '未查询' : feedback.applied ? feedbackChanged ? '已接管 · 已改变' : '已接管 · 结果相同' : feedback.matched ? feedback.reason === 'hard_safety_signal' ? '已匹配 · 禁止降级' : '已匹配 · 尚未生效' : '已查询 · 无匹配', snapshot: feedback.after?.status ? feedback.after : feedback.before, description: feedback.applied ? `${feedbackStats}；${feedbackChanged ? '已改变前序结果。' : '结果与前序一致。'}` : [feedbackStats, feedbackReason].filter(Boolean).join('；') },
        { key: 'final', title: '最终决定', state: 'final' as StageState, badge: '最终结果', snapshot: flow.final, description: '该状态、分值和决策代码是本次审核的权威结果。' },
    ];
});
</script>

<style scoped>
.audit-detail { display: flex; flex-direction: column; gap: 14px; }
.audit-meta-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: hidden; border: 1px solid #e4e7ed; border-radius: 6px; background: #fff; }
.audit-meta-panel > div { display: flex; min-width: 0; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f0f2f5; }
.audit-meta-panel > div:nth-child(odd) { border-right: 1px solid #f0f2f5; }
.audit-meta-panel span { flex: 0 0 86px; color: #909399; font-size: 12px; }
.audit-meta-panel strong { min-width: 0; overflow: hidden; color: #303133; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: monospace; }
.audit-section { padding: 16px; border: 1px solid #e4e7ed; border-radius: 6px; background: linear-gradient(180deg, #fafcff, #fff); }
.audit-section h3 { margin: 0 0 12px; padding-bottom: 12px; border-bottom: 1px solid #e4e7ed; color: #303133; font-size: 14px; font-weight: 500; }
.audit-section h4 { margin: 18px 0 9px; color: #909399; font-size: 12px; font-weight: 500; }
.decision-section, .engine-section { background: linear-gradient(180deg, #f3f9ff, #fff); }
.behavior-section { background: linear-gradient(180deg, #f5fbf8, #fff); }
.reasons-section { background: linear-gradient(180deg, #fff8f0, #fff); }
.full-content { margin: 0; color: #303133; font-size: 14px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
.chip-list, .probability-list, .threshold-list { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-list span, .probability-list span, .threshold-list span { padding: 4px 8px; border: 1px solid #d9ecff; border-radius: 4px; background: #fff; color: #606266; font-size: 11px; }
.chip-list span { border-color: #f3d19e; color: #7d4b00; }
details { margin-top: 12px; color: #909399; font-size: 11px; }
details summary { cursor: pointer; }
details code { display: block; margin-top: 5px; padding: 5px 7px; border-radius: 3px; background: #f5f7fa; overflow-wrap: anywhere; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.summary-grid > div { display: flex; min-width: 0; flex-direction: column; gap: 4px; padding: 9px 10px; border: 1px solid #d9ecff; border-radius: 4px; background: #fff; }
.summary-grid span { color: #909399; font-size: 11px; }
.summary-grid strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; }
.probability-list, .threshold-list { margin-top: 10px; }
.dedup-note, .context-card { margin-top: 9px; padding: 9px 11px; border: 1px solid #e4e7ed; border-radius: 4px; background: #fff; color: #606266; font-size: 11px; line-height: 1.7; }
.context-card p { margin: 0 0 5px; }
.context-card p:last-child { margin-bottom: 0; }
.decision-flow-list { display: flex; flex-direction: column; }
.decision-flow-item { position: relative; display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 10px; padding-bottom: 12px; }
.decision-flow-item:not(:last-child)::before { position: absolute; top: 12px; bottom: -2px; left: 5px; width: 1px; background: #dcdfe6; content: ''; }
.decision-flow-marker { position: relative; z-index: 1; width: 10px; height: 10px; margin-top: 6px; border: 2px solid #c0c4cc; border-radius: 50%; background: #fff; }
.is-changed .decision-flow-marker { border-color: #67c23a; background: #f0f9eb; }
.is-blocked .decision-flow-marker, .is-error .decision-flow-marker { border-color: #f56c6c; background: #fef0f0; }
.is-waiting .decision-flow-marker { border-color: #e6a23c; background: #fdf6ec; }
.is-final .decision-flow-marker { border-color: #409eff; background: #ecf5ff; }
.decision-flow-main { min-width: 0; padding: 9px 10px; border: 1px solid #e4e7ed; border-radius: 4px; background: #fff; }
.decision-flow-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.decision-flow-heading strong { font-size: 13px; font-weight: 500; }
.decision-flow-main p { margin: 7px 0 3px; color: #303133; font-size: 12px; line-height: 1.6; }
.decision-flow-main > span { color: #909399; font-size: 11px; line-height: 1.6; }
.clause-list { display: flex; flex-direction: column; gap: 8px; }
.clause-list > div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; padding: 9px 10px; border: 1px solid #ebeef5; border-radius: 4px; background: #fff; }
.clause-list span { color: #409eff; font-size: 12px; }
.clause-list p { margin: 0; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e4e7ed; }
.section-header h3 { margin: 0; padding: 0; border: 0; }
.text-grid { overflow: hidden; border: 1px solid #ebeef5; border-radius: 4px; }
.text-grid > div { display: flex; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #f0f2f5; }
.text-grid > div:last-child { border-bottom: 0; }
.text-grid span { flex: 0 0 70px; color: #909399; font-size: 12px; line-height: 22px; }
.text-grid p { min-width: 0; margin: 0; line-height: 22px; white-space: pre-wrap; word-break: break-word; }
@media (max-width: 720px) { .audit-meta-panel, .summary-grid { grid-template-columns: 1fr; } .audit-meta-panel > div:nth-child(odd) { border-right: 0; } }
</style>
