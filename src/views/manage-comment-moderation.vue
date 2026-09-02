<template>
    <div class="moderation-page">
        <section
            ref="workbenchRef"
            class="moderation-workbench"
            :class="{ 'is-resizing': resizing }"
            :style="workbenchStyle">
            <div class="input-panel">
                <div class="panel-header">
                    <div>
                        <span class="panel-title">评论审核模拟</span>
                    </div>
                    <div class="panel-tools">
                        <el-popover placement="bottom-end" :width="400" trigger="click">
                            <template #reference>
                                <el-button :type="hasModerationContext ? 'primary' : 'default'" plain>
                                    审核上下文
                                </el-button>
                            </template>
                            <div class="behavior-context-form">
                                <p>本地上下文（选填，不参与关键词探测）</p>
                                <el-input v-model="semanticArticleTitle" clearable maxlength="100" placeholder="文章标题" />
                                <el-input v-model="semanticArticleCategory" clearable maxlength="100" placeholder="文章分类" />
                                <el-input v-model="semanticParentContent" clearable maxlength="1000" type="textarea" :rows="2" placeholder="父评论正文" />
                                <el-input v-model="semanticReplyToContent" clearable maxlength="1000" type="textarea" :rows="2" placeholder="被回复评论正文" />
                                <el-divider />
                                <p>行为上下文（只读检查，不写入统计）</p>
                                <el-input v-model="behaviorUserID" clearable placeholder="用户 ID" />
                                <el-input v-model="behaviorArticleID" clearable placeholder="文章 ID" />
                                <el-input v-model="behaviorClientIP" clearable placeholder="客户端 IP" />
                            </div>
                        </el-popover>
                        <el-tag :type="lineLimitExceeded ? 'danger' : 'info'" effect="light">
                            评论数：{{ commentLines.length }}/5000
                        </el-tag>
                    </div>
                </div>

                <div class="editor-shell">
                    <div class="editor-body" @click="focusEditor">
                        <div class="editor-active-line" :style="activeLineStyle"></div>
                        <div class="editor-gutter" :style="editorGutterStyle">
                            <div class="editor-line-number-list" :style="editorLineNumberListStyle">
                                <div
                                    v-for="line in editorLineNumbers"
                                    :key="line"
                                    class="editor-line-number"
                                    :class="{ 'is-active': line === activeInputLine }">
                                    {{ line }}
                                </div>
                            </div>
                        </div>
                        <textarea
                            ref="editorRef"
                            v-model="rawInput"
                            class="editor-textarea"
                            :style="editorTextareaStyle"
                            wrap="off"
                            spellcheck="false"
                            autocomplete="off"
                            placeholder="这篇文章写得很好&#10;可以加微信继续交流吗&#10;这里有赌博博彩项目"
                            @beforeinput="handleEditorBeforeInput"
                            @click="updateActiveInputLine"
                            @input="handleEditorInput"
                            @keyup="updateActiveInputLine"
                            @paste="handleEditorPaste"
                            @scroll="handleEditorScroll"></textarea>
                    </div>
                </div>

                <div class="input-actions">
                    <div class="action-group">
                        <el-button @click="resetPreview">清空</el-button>
                        <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="runPreview">
                            开始审核
                        </el-button>
                    </div>
                </div>
            </div>

            <div
                class="workbench-resizer"
                role="separator"
                aria-orientation="vertical"
                title="拖动调整宽度"
                @mousedown="startResize">
                <span></span>
            </div>

            <div class="result-panel">
                <div class="result-toolbar">
                    <div class="result-heading">
                        <span class="result-title">审核结果</span>
                        <span v-if="previewResult" class="result-run-meta">
                            {{ formatEvaluatedAt(previewResult.evaluatedAt) }} · 策略 {{ previewResult.policyVersion }}
                        </span>
                    </div>
                    <el-input
                        v-model="resultContentKeyword"
                        class="result-search"
                        clearable
                        placeholder="搜索评论内容"
                        @clear="handleResultFilterChange"
                        @input="handleResultFilterChange" />
                </div>

                <el-table
                    v-loading="loading"
                    :data="pagedPreviewRows"
                    scrollbar-always-on
                    class="result-table"
                    height="100%">
                    <el-table-column label="行号" min-width="76" max-width="90">
                        <template #default="scope">
                            <button type="button" class="line-jump-button" @click="focusInputLine(scope.row.line)">
                                {{ scope.row.line }}
                            </button>
                        </template>
                    </el-table-column>
                    <el-table-column min-width="132" max-width="156">
                        <template #header>
                            <el-dropdown trigger="click" @command="setResultStatusFilter">
                                <button type="button" class="status-filter-trigger">
                                    <span>审核状态</span>
                                    <span class="status-filter-caret"></span>
                                </button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="" :class="{ 'is-selected': resultStatusFilter === '' }">
                                            全部状态
                                        </el-dropdown-item>
                                        <el-dropdown-item command="approved" :class="{ 'is-selected': resultStatusFilter === 'approved' }">
                                            已通过
                                        </el-dropdown-item>
                                        <el-dropdown-item command="pending" :class="{ 'is-selected': resultStatusFilter === 'pending' }">
                                            待审核
                                        </el-dropdown-item>
                                        <el-dropdown-item command="rejected" :class="{ 'is-selected': resultStatusFilter === 'rejected' }">
                                            已拒绝
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </template>
                        <template #default="scope">
                            <el-tag :type="statusTagType(scope.row.status)" effect="light">
                                {{ statusText(scope.row.status) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="riskScore" label="最终分值" min-width="82" max-width="96" />
                    <el-table-column label="融合风险" min-width="86" max-width="104">
                        <template #default="scope">
                            {{ probabilityText(scope.row.trace?.decisionEngine?.decision?.riskProbability) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="评论内容" min-width="280" show-overflow-tooltip>
                        <template #default="scope">
                            <span class="content-cell">{{ scope.row.content }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="机审原因" min-width="300" show-overflow-tooltip>
                        <template #default="scope">
                            <span>{{ reasonSummary(scope.row) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" min-width="92" max-width="110" fixed="right">
                        <template #default="scope">
                            <el-button type="primary" plain @click="openDetail(scope.row)">详情</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <div class="result-pagination">
                    <el-pagination
                        v-model:current-page="resultCurrentPage"
                        v-model:page-size="resultPageSize"
                        background
                        :page-sizes="RESULT_PAGE_SIZES"
                        :total="filteredPreviewRows.length"
                        layout="total, sizes, prev, pager, next, jumper" />
                </div>
            </div>
        </section>

        <el-drawer v-model="detailDrawer" :destroy-on-close="true" size="min(920px, 92vw)" class="moderation-detail-drawer admin-drawer admin-detail-drawer">
            <template #header>
                <div class="drawer-header">
                    <span class="drawer-title">审核详情</span>
                    <el-button
                        v-if="selectedRow?.auditID"
                        type="primary"
                        :disabled="feedbackSubmitting"
                        @click="openFeedbackDialog">
                        人工反馈
                    </el-button>
                </div>
            </template>

            <div v-if="selectedRow" class="detail-body">
                <div class="detail-meta-panel">
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">行号</span>
                        <span class="detail-meta-value">{{ selectedRow.line }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">状态</span>
                        <span class="detail-meta-value">
                            <el-tag :type="statusTagType(selectedRow.status)" effect="light">
                                {{ statusText(selectedRow.status) }}
                            </el-tag>
                        </span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">最终分值</span>
                        <span class="detail-meta-value">{{ selectedRow.riskScore }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">审计记录</span>
                        <span class="detail-meta-value">{{ selectedRow.auditID || '-' }}</span>
                    </div>
					<div class="detail-meta-row">
						<span class="detail-meta-label">运行批次</span>
						<span class="detail-meta-value">{{ previewResult?.batchID || '-' }}</span>
					</div>
					<div class="detail-meta-row">
						<span class="detail-meta-label">策略快照</span>
						<span class="detail-meta-value">{{ previewResult?.policyVersion || '-' }}</span>
					</div>
					<div class="detail-meta-row">
						<span class="detail-meta-label">执行时间</span>
						<span class="detail-meta-value">{{ formatEvaluatedAt(previewResult?.evaluatedAt) }}</span>
					</div>
					<div class="detail-meta-row">
						<span class="detail-meta-label">输入上下文</span>
						<span class="detail-meta-value">{{ executionContextText(previewResult) }}</span>
					</div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">决策</span>
                        <span class="detail-meta-value">{{ moderationDecisionText(selectedRow.decision) }}</span>
                    </div>
                    <div class="detail-meta-row">
                        <span class="detail-meta-label">行为检测</span>
                        <span class="detail-meta-value">
                            {{ behaviorStatusText(selectedRow.trace?.behavior) }}
                        </span>
                    </div>
                    <div v-if="selectedRow.trace?.decisionEngine" class="detail-meta-row">
                        <span class="detail-meta-label">概率建议</span>
                        <span class="detail-meta-value">
                            <el-tag :type="statusTagType(selectedRow.trace.decisionEngine.decision.status)" effect="light">
                                {{ statusText(selectedRow.trace.decisionEngine.decision.status) }}
							</el-tag>
							· 风险 {{ probabilityText(selectedRow.trace.decisionEngine.decision.riskProbability) }}
							· {{ probabilityApplicationText(selectedRow.trace.decisions.probability) }}
                        </span>
                    </div>
                </div>

                <div class="detail-section detail-section--decision-flow">
                    <div class="detail-section-title">最终决策链</div>
                    <div class="decision-flow-list">
                        <div
                            v-for="stage in decisionFlowStages(selectedRow)"
                            :key="stage.key"
                            class="decision-flow-item"
                            :class="`is-${stage.state}`">
                            <div class="decision-flow-marker"></div>
                            <div class="decision-flow-main">
                                <div class="decision-flow-heading">
                                    <strong>{{ stage.title }}</strong>
                                    <el-tag :type="stageTagType(stage.state)" size="small" effect="light">
                                        {{ stage.badge }}
                                    </el-tag>
                                </div>
                                <p>
                                    {{ statusText(stage.snapshot.status) }}
                                    · 分值 {{ stage.snapshot.score }}
                                    · {{ moderationDecisionText(stage.snapshot.decision) }}
                                </p>
                                <span v-if="stage.description">{{ stage.description }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-section detail-section--behavior">
                    <div class="detail-section-title">行为检测执行情况</div>
                    <el-alert
                        v-if="selectedRow.trace.behavior.status !== 'executed'"
                        :closable="false"
                        :type="selectedRow.trace.behavior.status === 'skipped' ? 'info' : 'warning'"
                        show-icon
                        :title="behaviorStatusText(selectedRow.trace.behavior)" />
                    <el-table
                        v-if="selectedRow.trace.behavior.metrics?.length"
                        :data="selectedRow.trace.behavior.metrics"
                        size="small"
                        class="signal-table">
                        <el-table-column label="指标" min-width="130">
                            <template #default="scope">{{ behaviorMetricText(scope.row.name) }}</template>
                        </el-table-column>
                        <el-table-column label="执行" width="76">
                            <template #default="scope">{{ scope.row.evaluated ? '是' : '否' }}</template>
                        </el-table-column>
						<el-table-column label="未执行原因" min-width="150">
							<template #default="scope">
								{{ scope.row.evaluated ? '-' : behaviorMetricReasonText(scope.row.skippedReason) }}
							</template>
						</el-table-column>
                        <el-table-column label="已有" width="66">
                            <template #default="scope">{{ scope.row.evaluated ? scope.row.observedCount : '-' }}</template>
                        </el-table-column>
                        <el-table-column label="计入本条" width="80">
                            <template #default="scope">{{ scope.row.evaluated ? scope.row.prospectiveCount : '-' }}</template>
                        </el-table-column>
                        <el-table-column label="窗口" width="88">
                            <template #default="scope">{{ durationText(scope.row.windowSeconds) }}</template>
                        </el-table-column>
                        <el-table-column prop="reviewThreshold" label="待审阈值" width="80" />
                        <el-table-column label="拒绝阈值" width="80">
                            <template #default="scope">{{ scope.row.blockThreshold || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="触发" width="82">
                            <template #default="scope">
                                {{ scope.row.triggeredLevel ? moderationLevelText(scope.row.triggeredLevel) : '未触发' }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">评论正文</div>
                    <p class="detail-content">{{ selectedRow.content }}</p>
                </div>

                <div v-if="selectedRow.reasons?.length" class="detail-section detail-section--reasons">
                    <div class="detail-section-title">机审原因</div>
                    <div class="reason-list">
                        <span v-for="(reason, index) in selectedRow.reasons" :key="`${index}-${reason}`" class="reason-chip">
                            {{ reason }}
                        </span>
                    </div>
					<details v-if="selectedRow.rawReasons?.length" class="raw-reason-details">
						<summary>查看原始原因代码</summary>
						<code v-for="reason in selectedRow.rawReasons" :key="reason">{{ reason }}</code>
					</details>
                </div>

                <div v-if="selectedRow.trace?.decisionEngine" class="detail-section detail-section--decision-engine">
                    <div class="detail-section-title">概率决策链路</div>
                    <div class="decision-engine-summary-grid">
                        <div>
                            <span>融合风险</span>
                            <strong>{{ probabilityText(selectedRow.trace.decisionEngine.decision.riskProbability) }}</strong>
                        </div>
                        <div>
                            <span>决策置信度</span>
                            <strong>{{ probabilityText(selectedRow.trace.decisionEngine.decision.confidence) }}</strong>
                        </div>
                        <div>
                            <span>校准版本</span>
                            <strong>{{ selectedRow.trace.decisionEngine.decision.calibration }}</strong>
                        </div>
                        <div>
                            <span>是否接管</span>
                            <strong>{{ selectedRow.trace.decisions.probability.applied ? '已应用' : '未应用' }}</strong>
                        </div>
                    </div>
                    <el-alert
                        v-if="selectedRow.trace.decisionEngine.decision.fallbackReason"
                        :closable="false"
                        type="info"
                        show-icon
                        :title="fallbackReasonText(selectedRow.trace.decisionEngine.decision.fallbackReason)" />
                    <div
                        v-if="probabilityEntries(selectedRow.trace.decisionEngine.decision.categoryProbabilities).length"
                        class="probability-chip-list">
                        <span
                            v-for="item in probabilityEntries(selectedRow.trace.decisionEngine.decision.categoryProbabilities)"
                            :key="item.category">
                            {{ moderationCategoryText(item.category) }} {{ probabilityText(item.probability) }}
                        </span>
                    </div>

                    <div class="decision-engine-subsection-title">分类融合计算</div>
                    <div class="fusion-thresholds">
                        <span>通过 ≤ {{ probabilityText(selectedRow.trace.decisionEngine.fusion.thresholds.approveMax) }}</span>
                        <span>拒绝 ≥ {{ probabilityText(selectedRow.trace.decisionEngine.fusion.thresholds.rejectMin) }}</span>
                        <span>最低语境置信度 {{ probabilityText(selectedRow.trace.decisionEngine.fusion.thresholds.minConfidence) }}</span>
                    </div>
                    <el-table
                        v-if="selectedRow.trace.decisionEngine.fusion.categories?.length"
                        :data="selectedRow.trace.decisionEngine.fusion.categories"
                        size="small"
                        class="signal-table">
                        <el-table-column label="分类" min-width="112">
                            <template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template>
                        </el-table-column>
                        <el-table-column label="规则风险" width="82">
                            <template #default="scope">{{ probabilityText(scope.row.ruleRisk) }}</template>
                        </el-table-column>
                        <el-table-column label="语境风险" width="82">
                            <template #default="scope">{{ scope.row.contextCovered ? probabilityText(scope.row.contextRisk) : '-' }}</template>
                        </el-table-column>
                        <el-table-column label="语境权重" width="82">
                            <template #default="scope">{{ scope.row.contextCovered ? probabilityText(scope.row.contextWeight) : '-' }}</template>
                        </el-table-column>
                        <el-table-column label="行为风险" width="82">
                            <template #default="scope">{{ probabilityText(scope.row.behaviorRisk) }}</template>
                        </el-table-column>
                        <el-table-column label="反证扣减" width="82">
                            <template #default="scope">{{ probabilityText(scope.row.counterEvidence) }}</template>
                        </el-table-column>
                        <el-table-column label="最终风险" width="82">
                            <template #default="scope"><strong>{{ probabilityText(scope.row.finalRisk) }}</strong></template>
                        </el-table-column>
                    </el-table>
                    <div class="decision-engine-subsection-title">候选还原（保留原文，不做强制替换）</div>
                    <el-table
                        v-if="selectedRow.trace.decisionEngine.candidates?.length"
                        :data="selectedRow.trace.decisionEngine.candidates"
                        size="small"
                        class="signal-table">
						<el-table-column prop="clauseID" label="分句" width="64">
							<template #default="scope">{{ scope.row.clauseID || '全局' }}</template>
						</el-table-column>
                        <el-table-column prop="observed" label="原文片段" min-width="110" show-overflow-tooltip />
                        <el-table-column label="方法" min-width="140">
                            <template #default="scope">{{ rewriteMethodText(scope.row.method) }}</template>
                        </el-table-column>
                        <el-table-column label="分类" min-width="110">
                            <template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template>
                        </el-table-column>
						<el-table-column label="关系角色" width="92">
							<template #default="scope">{{ rewriteRoleText(scope.row.role) }}</template>
						</el-table-column>
                        <el-table-column prop="text" label="候选文本" min-width="240" show-overflow-tooltip />
                        <el-table-column label="置信度" width="86">
                            <template #default="scope">{{ probabilityText(scope.row.confidence) }}</template>
                        </el-table-column>
                        <el-table-column label="歧义" width="66">
                            <template #default="scope">{{ scope.row.ambiguous ? '有' : '无' }}</template>
                        </el-table-column>
                        <el-table-column prop="rationale" label="说明" min-width="220" show-overflow-tooltip />
                    </el-table>
                    <el-empty v-else description="没有生成候选文本" :image-size="60" />

                    <div class="decision-engine-subsection-title">去重后的证据</div>
                    <el-table
                        v-if="selectedRow.trace.decisionEngine.evidence?.length"
                        :data="selectedRow.trace.decisionEngine.evidence"
                        size="small"
                        class="signal-table">
						<el-table-column prop="clauseID" label="分句" width="64">
							<template #default="scope">{{ scope.row.clauseID || '全局' }}</template>
						</el-table-column>
                        <el-table-column label="来源" min-width="94">
                            <template #default="scope">{{ moderationSourceText(scope.row.source) }}</template>
                        </el-table-column>
                        <el-table-column label="分类" min-width="110">
                            <template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template>
                        </el-table-column>
                        <el-table-column label="方向" width="72">
                            <template #default="scope">{{ scope.row.polarity === 'negative' ? '反证' : '风险' }}</template>
                        </el-table-column>
                        <el-table-column label="强度" width="76">
                            <template #default="scope">{{ probabilityText(scope.row.confidence) }}</template>
                        </el-table-column>
                        <el-table-column prop="value" label="证据" min-width="150" show-overflow-tooltip />
						<el-table-column prop="ruleID" label="规则 ID" min-width="140" show-overflow-tooltip />
                        <el-table-column prop="correlationGroup" label="相关组" min-width="220" show-overflow-tooltip />
                    </el-table>
                    <el-empty v-else description="没有风险证据" :image-size="60" />
					<div v-if="selectedRow.trace.decisionEngine.fusion.deduplicated?.length" class="dedup-summary">
						输入 {{ selectedRow.trace.decisionEngine.fusion.inputCount }} 条证据，保留
						{{ selectedRow.trace.decisionEngine.fusion.outputCount }} 条；
						{{ selectedRow.trace.decisionEngine.fusion.deduplicated.length }} 条相关证据被去重。
					</div>
					<el-table
						v-if="selectedRow.trace.decisionEngine.fusion.deduplicated?.length"
						:data="selectedRow.trace.decisionEngine.fusion.deduplicated"
						size="small"
						class="signal-table dedup-table">
						<el-table-column prop="discarded.id" label="丢弃证据" min-width="96" />
						<el-table-column label="来源" min-width="96">
							<template #default="scope">{{ moderationSourceText(scope.row.discarded.source) }}</template>
						</el-table-column>
						<el-table-column prop="discarded.value" label="证据内容" min-width="150" show-overflow-tooltip />
						<el-table-column label="强度" width="76">
							<template #default="scope">{{ probabilityText(scope.row.discarded.confidence) }}</template>
						</el-table-column>
						<el-table-column prop="keptID" label="保留证据" min-width="96" />
						<el-table-column label="原因" min-width="160">
							<template #default="scope">{{ dedupReasonText(scope.row.reason) }}</template>
						</el-table-column>
					</el-table>

                    <div class="decision-engine-subsection-title">本地上下文分析</div>
                    <div v-if="selectedRow.trace.decisionEngine.context.analyzed" class="context-assessment">
                        <p>
                            进程内分析
                            · 置信度 {{ probabilityText(selectedRow.trace.decisionEngine.context.confidence) }}
                            · 良性概率 {{ probabilityText(selectedRow.trace.decisionEngine.context.benignProbability) }}
                        </p>
                        <p v-if="selectedRow.trace.decisionEngine.context.intent">
                            意图：{{ moderationIntentText(selectedRow.trace.decisionEngine.context.intent) }}
                        </p>
                        <p v-if="selectedRow.trace.decisionEngine.context.explanation">
                            说明：{{ selectedRow.trace.decisionEngine.context.explanation }}
                        </p>
                    </div>
					<el-alert
						v-else
						:closable="false"
						type="warning"
						show-icon
						:title="fallbackReasonText(selectedRow.trace.decisionEngine.context.unavailableReason || 'context_analyzer_unavailable')" />
					<div class="decision-engine-subsection-title">本地分析原始证据</div>
					<el-table
						v-if="selectedRow.trace.decisionEngine.context.evidence?.length"
						:data="selectedRow.trace.decisionEngine.context.evidence"
						size="small"
						class="signal-table">
						<el-table-column prop="clauseID" label="分句" width="64">
							<template #default="scope">{{ scope.row.clauseID || '全局' }}</template>
						</el-table-column>
						<el-table-column label="分类" min-width="110">
							<template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template>
						</el-table-column>
						<el-table-column label="方向" width="72">
							<template #default="scope">{{ scope.row.polarity === 'negative' ? '反证' : '风险' }}</template>
						</el-table-column>
						<el-table-column label="强度" width="76">
							<template #default="scope">{{ probabilityText(scope.row.confidence) }}</template>
						</el-table-column>
						<el-table-column prop="value" label="证据" min-width="160" show-overflow-tooltip />
						<el-table-column prop="correlationGroup" label="相关组" min-width="220" show-overflow-tooltip />
					</el-table>
					<el-empty v-else description="本地分析没有生成额外证据" :image-size="60" />
					<div class="decision-engine-subsection-title">分句关系（行动与评价立场）</div>
					<el-table
						v-if="selectedRow.trace.decisionEngine.context.relations?.length"
						:data="selectedRow.trace.decisionEngine.context.relations"
						size="small"
						class="signal-table">
						<el-table-column prop="clauseID" label="分句" width="64" />
						<el-table-column label="类型" width="82">
							<template #default="scope">{{ moderationRelationTypeText(scope.row.type) }}</template>
						</el-table-column>
						<el-table-column prop="subject" label="主体" min-width="96" show-overflow-tooltip />
						<el-table-column prop="action" label="动作" min-width="96" show-overflow-tooltip />
						<el-table-column prop="object" label="对象" min-width="140" show-overflow-tooltip />
						<el-table-column prop="predicate" label="判断谓词" min-width="100" show-overflow-tooltip />
						<el-table-column prop="result" label="结果" min-width="160" show-overflow-tooltip />
						<el-table-column label="立场" min-width="100">
							<template #default="scope">{{ moderationRelationStanceText(scope.row.stance) }}</template>
						</el-table-column>
						<el-table-column label="分类" min-width="110">
							<template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template>
						</el-table-column>
						<el-table-column label="关系子类型" min-width="150">
							<template #default="scope">{{ moderationRelationSubtypeText(scope.row.subtype) }}</template>
						</el-table-column>
						<el-table-column prop="evidence" label="关系证据" min-width="150" show-overflow-tooltip />
						<el-table-column label="作用域" min-width="180">
							<template #default="scope">
								<el-tag v-if="scope.row.negated" type="success" size="small">已否定</el-tag>
								<el-tag v-if="scope.row.quoted" type="info" size="small">引用</el-tag>
								<el-tag v-if="scope.row.reported" type="info" size="small">转述</el-tag>
								<el-tag v-if="scope.row.inferred" type="warning" size="small">含推断</el-tag>
								<span v-if="!scope.row.negated && !scope.row.quoted && !scope.row.reported && !scope.row.inferred">直接表达</span>
							</template>
						</el-table-column>
						<el-table-column label="置信度" width="86">
							<template #default="scope">{{ probabilityText(scope.row.confidence) }}</template>
						</el-table-column>
					</el-table>
					<el-empty v-else description="没有形成完整关系" :image-size="60" />
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">语义分句</div>
                    <div v-if="selectedRow.trace?.clauses?.length" class="clause-list">
                        <div v-for="clause in selectedRow.trace.clauses" :key="clause.id" class="clause-item">
                            <span class="clause-id">片段 {{ clause.id }}</span>
                            <p>{{ clause.text.raw }}</p>
                        </div>
                    </div>
                    <el-empty v-else description="没有分句信息" :image-size="72" />
                </div>

                <div class="detail-section">
                    <div class="detail-section-header">
                        <div class="detail-section-title">审核信号流水线</div>
                        <el-radio-group v-model="signalStage" size="small">
                            <el-radio-button label="detector">
                                原始 {{ selectedRow.trace?.detectorSignals?.length || 0 }}
                            </el-radio-button>
                            <el-radio-button label="suppressed">
                                已抑制 {{ selectedRow.trace?.suppressedSignals?.length || 0 }}
                            </el-radio-button>
                            <el-radio-button label="final">
                                最终 {{ selectedRow.signals?.length || 0 }}
                            </el-radio-button>
                        </el-radio-group>
                    </div>
                    <el-table v-if="selectedSignalRows.length" :data="selectedSignalRows" size="small" class="signal-table">
                        <el-table-column prop="clauseID" label="片段" width="66">
                            <template #default="scope">{{ scope.row.clauseID || '全局' }}</template>
                        </el-table-column>
                        <el-table-column label="来源" min-width="92">
                            <template #default="scope">{{ moderationSourceText(scope.row.source) }}</template>
                        </el-table-column>
                        <el-table-column label="分类" min-width="110" show-overflow-tooltip>
                            <template #default="scope">{{ moderationCategoryText(scope.row.category) }}</template>
                        </el-table-column>
                        <el-table-column label="等级" min-width="92">
                            <template #default="scope">{{ moderationLevelText(scope.row.level) }}</template>
                        </el-table-column>
                        <el-table-column prop="score" label="分值" width="64" />
                        <el-table-column prop="ruleID" label="规则 ID" min-width="150" show-overflow-tooltip />
                        <el-table-column prop="evidence" label="证据" min-width="160" show-overflow-tooltip />
                        <el-table-column label="原因" min-width="220" show-overflow-tooltip>
                            <template #default="scope">{{ scope.row.reasonText || scope.row.reason || '-' }}</template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-else :description="emptySignalStageText" :image-size="72" />
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">文本归一化</div>
                    <div class="text-grid">
                        <div class="text-row">
                            <span>原文</span>
                            <p>{{ selectedRow.text.raw || '-' }}</p>
                        </div>
                        <div class="text-row">
                            <span>归一化</span>
                            <p>{{ selectedRow.text.normalized || '-' }}</p>
                        </div>
                        <div class="text-row">
                            <span>紧凑文本</span>
                            <p>{{ selectedRow.text.compact || '-' }}</p>
                        </div>
                        <div v-if="selectedRow.text.confusable" class="text-row">
                            <span>混淆骨架</span>
                            <p>{{ selectedRow.text.confusable }}</p>
                        </div>
                        <div v-if="selectedRow.text.decodedTexts?.length" class="text-row">
                            <span>解码文本</span>
                            <p>{{ selectedRow.text.decodedTexts.join('\n') }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </el-drawer>

		<el-dialog
			v-model="feedbackDialog"
			class="moderation-feedback-dialog"
			width="min(640px, calc(100vw - 32px))"
			:close-on-click-modal="false">
			<template #header>
				<div class="feedback-dialog-title">
					<strong>人工审核反馈</strong>
					<span>纠正本次审核，并形成后续决策可复用的校准证据</span>
				</div>
			</template>
			<el-alert
				:closable="false"
				type="info"
				show-icon
				title="模拟记录与真实评论分流保存；已确认反馈会共同参与后续真实评论的校准。" />
			<div class="feedback-context-card">
				<div>
					<span>审核记录</span>
					<strong>{{ selectedRow?.auditID || '-' }}</strong>
				</div>
				<div>
					<span>当前结果</span>
					<el-tag v-if="selectedRow" :type="statusTagType(selectedRow.status)" effect="light">
						{{ statusText(selectedRow.status) }} · {{ moderationDecisionText(selectedRow.decision) }}
					</el-tag>
				</div>
				<p>{{ selectedRow?.content || '-' }}</p>
			</div>
			<el-form label-position="top" class="feedback-form">
				<el-form-item label="正确状态" required>
					<el-radio-group v-model="feedbackForm.expectedStatus" class="feedback-status-group">
						<el-radio-button label="approved">已通过</el-radio-button>
						<el-radio-button label="pending">待审核</el-radio-button>
						<el-radio-button label="rejected">已拒绝</el-radio-button>
					</el-radio-group>
					<div class="feedback-field-help">请选择人工判断后的最终业务状态，而不是重复当前机器结果。</div>
				</el-form-item>
				<el-form-item
					label="正确分类"
					:required="feedbackForm.expectedStatus !== 'approved'">
					<el-select
						v-model="feedbackForm.expectedCategory"
						style="width: 100%"
						filterable
						clearable
						:disabled="feedbackForm.expectedStatus === 'approved'"
						:placeholder="feedbackForm.expectedStatus === 'approved' ? '已通过无需风险分类' : '选择最主要的风险分类'">
						<el-option
							v-for="option in feedbackCategoryOptions"
							:key="option.value"
							:label="`${option.label}（${option.value}）`"
							:value="option.value" />
					</el-select>
					<div class="feedback-field-help">
						{{ feedbackForm.expectedStatus === 'approved'
							? '通过表示没有需要处置的主要风险，分类会自动清空。'
							: '分类来自后端审核分类表，不能提交任意字符串。' }}
					</div>
				</el-form-item>
				<el-form-item label="判断依据（可选）">
					<el-input
						v-model="feedbackForm.note"
						type="textarea"
						:rows="4"
						maxlength="500"
						show-word-limit
						placeholder="说明误判或漏判原因，例如：这是风险科普语境，不是在传播或鼓励。" />
					<div class="feedback-field-help">建议写明对象、动作、否定或引用关系，便于后续排查冲突反馈。</div>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="feedback-dialog-footer">
					<span>提交后，同一管理员再次反馈该记录会覆盖自己的上一版反馈。</span>
					<div>
						<el-button @click="feedbackDialog = false">取消</el-button>
						<el-button type="primary" :loading="feedbackSubmitting" @click="submitFeedback">确认并纳入校准</el-button>
					</div>
				</div>
			</template>
		</el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElNotification } from 'element-plus';
import _axios from '../utils/axios';

type CommentStatus = 'pending' | 'approved' | 'rejected';
type ResultStatusFilter = CommentStatus | '';

interface ModerationPreviewText {
    raw: string;
    normalized: string;
    compact: string;
    confusable?: string;
    decodedTexts?: string[];
}

interface ModerationPreviewSignal {
    source: string;
    category?: string;
    level?: string;
    score: number;
    reason?: string;
    reasonText?: string;
    evidence?: string;
    ruleID?: string;
    clauseID?: number;
}

interface ModerationPreviewClause {
    id: number;
    text: ModerationPreviewText;
}

interface ModerationPreviewTrace {
    clauses: ModerationPreviewClause[];
    detectorSignals?: ModerationPreviewSignal[];
    suppressedSignals?: ModerationPreviewSignal[];
    behavior: ModerationBehaviorTrace;
    decisionEngine?: ModerationDecisionEngineTrace;
    decisions: ModerationDecisionFlow;
}

interface ModerationBehaviorMetric {
    name: string;
    evaluated: boolean;
    observedCount: number;
    prospectiveCount: number;
    windowSeconds: number;
    reviewThreshold: number;
    blockThreshold?: number;
    triggeredLevel?: string;
    skippedReason?: string;
}

interface ModerationBehaviorTrace {
    status: 'executed' | 'skipped' | 'unavailable' | 'failed';
    readOnly: boolean;
    contextProvided: boolean;
    unavailableReason?: string;
    metrics?: ModerationBehaviorMetric[];
}

interface ModerationRewriteCandidate {
    text: string;
    observed?: string;
    category?: string;
	role?: 'concept' | 'subject' | 'predicate';
    method: string;
    confidence: number;
    ambiguous: boolean;
    rationale?: string;
    clauseID?: number;
}

interface ModerationEvidence {
    id: string;
    source: string;
    category: string;
    polarity: 'positive' | 'negative';
    confidence: number;
    correlationGroup: string;
    value?: string;
    ruleID?: string;
    clauseID?: number;
}

interface ModerationContextAssessment {
    analyzed: boolean;
    confidence: number;
    intent?: string;
    benignProbability: number;
	evidence?: ModerationEvidence[];
	relations?: ModerationRelation[];
    explanation?: string;
    unavailableReason?: string;
}

interface ModerationEvidenceDeduplication {
    discarded: ModerationEvidence;
    keptID: string;
    reason: string;
}

interface ModerationCategoryFusion {
    category: string;
    ruleRisk: number;
    contextRisk: number;
    contextCovered: boolean;
    contextWeight: number;
    contentRisk: number;
    behaviorRisk: number;
    counterEvidence: number;
    finalRisk: number;
}

interface ModerationEvidenceFusion {
    thresholds: {
        approveMax: number;
        rejectMin: number;
        minConfidence: number;
    };
    categories?: ModerationCategoryFusion[];
    inputCount: number;
    outputCount: number;
    deduplicated?: ModerationEvidenceDeduplication[];
}

interface ModerationRelation {
	id: string;
	clauseID: number;
	type?: string;
	subject?: string;
	action?: string;
	object?: string;
	predicate?: string;
	result?: string;
	stance?: string;
	category?: string;
	subtype?: string;
	evidence?: string;
	negated: boolean;
	quoted: boolean;
	reported: boolean;
	inferred: boolean;
	confidence: number;
}

interface ModerationProbabilityDecision {
    status: CommentStatus;
    riskProbability: number;
    confidence: number;
    decision: string;
    calibration: string;
    categoryProbabilities?: Record<string, number>;
    actionable: boolean;
    fallbackReason?: string;
}

interface ModerationDecisionEngineTrace {
    candidates?: ModerationRewriteCandidate[];
    evidence?: ModerationEvidence[];
    context: ModerationContextAssessment;
    fusion: ModerationEvidenceFusion;
    decision: ModerationProbabilityDecision;
}

interface ModerationDecisionSnapshot {
    status: CommentStatus;
    score: number;
    decision: string;
}

interface ModerationDecisionApplication {
    evaluated: boolean;
    applied: boolean;
    before: ModerationDecisionSnapshot;
    candidate: ModerationDecisionSnapshot;
    after: ModerationDecisionSnapshot;
    reason?: string;
}

interface ModerationDecisionFlow {
    rule: ModerationDecisionSnapshot;
    probability: ModerationDecisionApplication;
    hardSafety: {
        evaluated: boolean;
        triggered: boolean;
        ruleID?: string;
        before: ModerationDecisionSnapshot;
        after: ModerationDecisionSnapshot;
        reason?: string;
    };
    feedback: {
        evaluated: boolean;
        matched: boolean;
        consensus: boolean;
        applied: boolean;
        scope?: 'exact' | 'relation';
        support: number;
        total: number;
        conflicts: number;
        simulationSupport: number;
        liveSupport: number;
        expectedStatus?: CommentStatus;
        expectedCategory?: string;
        before: ModerationDecisionSnapshot;
        after: ModerationDecisionSnapshot;
        reason?: string;
    };
    final: ModerationDecisionSnapshot;
}

interface ModerationPreviewRow {
	auditID?: string;
    line: number;
    content: string;
    status: CommentStatus;
    riskScore: number;
    decision: string;
    reasons?: string[];
    rawReasons?: string[];
    signals?: ModerationPreviewSignal[];
    text: ModerationPreviewText;
    trace: ModerationPreviewTrace;
}

interface ModerationPreviewResponse {
	batchID?: string;
    evaluatedAt: string;
    policyVersion: string;
	feedbackCategories?: string[];
    context: {
        userID?: string;
        articleID?: string;
        clientIPProvided: boolean;
        articleTitleProvided: boolean;
        articleCategoryProvided: boolean;
        parentContentProvided: boolean;
        replyContentProvided: boolean;
    };
    rows: ModerationPreviewRow[];
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    behaviorDryRun: boolean;
}

const rawInput = ref('');
const loading = ref(false);
const previewResult = ref<ModerationPreviewResponse | null>(null);
const resultStatusFilter = ref<ResultStatusFilter>('');
const resultContentKeyword = ref('');
const resultCurrentPage = ref(1);
const resultPageSize = ref(20);
const detailDrawer = ref(false);
const selectedRow = ref<ModerationPreviewRow | null>(null);
const signalStage = ref<'detector' | 'suppressed' | 'final'>('final');
const resizing = ref(false);
const workbenchRef = ref<HTMLElement | null>(null);
const inputPanelWidth = ref(480);
const editorRef = ref<HTMLTextAreaElement | null>(null);
const editorScrollTop = ref(0);
const activeInputLine = ref(1);
const behaviorUserID = ref('');
const behaviorArticleID = ref('');
const behaviorClientIP = ref('');
const semanticArticleTitle = ref('');
const semanticArticleCategory = ref('');
const semanticParentContent = ref('');
const semanticReplyToContent = ref('');
const feedbackDialog = ref(false);
const feedbackSubmitting = ref(false);
const feedbackForm = ref({
	expectedStatus: 'pending' as CommentStatus,
	expectedCategory: '',
	note: '',
});

const EDITOR_LINE_HEIGHT = 24;
const EDITOR_PADDING_TOP = 10;
const MAX_COMMENT_LINES = 5000;
const INPUT_PANEL_MIN_WIDTH = 280;
const RESULT_PANEL_MIN_WIDTH = 420;
const RESIZER_WIDTH = 8;
const RESULT_PAGE_SIZES = [10, 20, 50, 100, 200, 500];

const rawLines = computed(() => rawInput.value.split(/\r?\n/));
const inputLineCount = computed(() => (rawInput.value === '' ? 0 : rawLines.value.length));
const commentEntries = computed(() => rawLines.value
    .map((line, index) => ({ line: index + 1, content: line.trim() }))
    .filter((item) => item.content !== ''));
const commentLines = computed(() => commentEntries.value.map((item) => item.content));
const lineLimitExceeded = computed(() => inputLineCount.value > MAX_COMMENT_LINES);
const hasTooLongLine = computed(() => commentLines.value.some((line) => Array.from(line).length > 1000));
const canSubmit = computed(() => commentLines.value.length > 0 && !lineLimitExceeded.value && !hasTooLongLine.value && !loading.value);
const hasBehaviorContext = computed(() => Boolean(
    behaviorUserID.value.trim() || behaviorArticleID.value.trim() || behaviorClientIP.value.trim(),
));
const hasSemanticContext = computed(() => Boolean(
    semanticArticleTitle.value.trim()
    || semanticArticleCategory.value.trim()
    || semanticParentContent.value.trim()
    || semanticReplyToContent.value.trim(),
));
const hasModerationContext = computed(() => hasBehaviorContext.value || hasSemanticContext.value);
const totalInputLines = computed(() => Math.max(rawLines.value.length, 1));
const editorLineNumbers = computed(() => Array.from({ length: totalInputLines.value }, (_, index) => index + 1));
const editorGutterWidth = computed(() => Math.max(38, String(totalInputLines.value).length * 8 + 22));
const filteredPreviewRows = computed(() => {
    let rows = previewResult.value?.rows || [];
    if (resultStatusFilter.value) {
        rows = rows.filter((row) => row.status === resultStatusFilter.value);
    }
    const keyword = resultContentKeyword.value.trim().toLowerCase();
    if (keyword) {
        rows = rows.filter((row) => row.content.toLowerCase().includes(keyword));
    }
    return rows;
});
const maxResultPage = computed(() => Math.max(1, Math.ceil(filteredPreviewRows.value.length / resultPageSize.value)));
const pagedPreviewRows = computed(() => {
    const start = (resultCurrentPage.value - 1) * resultPageSize.value;
    return filteredPreviewRows.value.slice(start, start + resultPageSize.value);
});
const selectedSignalRows = computed(() => {
    const row = selectedRow.value;
    if (!row) return [];
    switch (signalStage.value) {
        case 'detector':
            return row.trace?.detectorSignals || [];
        case 'suppressed':
            return row.trace?.suppressedSignals || [];
        default:
            return row.signals || [];
    }
});
const emptySignalStageText = computed(() => {
    switch (signalStage.value) {
        case 'detector':
            return '探测器没有产生信号';
        case 'suppressed':
            return '语义层没有抑制信号';
        default:
            return '最终没有保留信号';
    }
});
const activeLineStyle = computed(() => ({
    top: `${EDITOR_PADDING_TOP + (activeInputLine.value - 1) * EDITOR_LINE_HEIGHT - editorScrollTop.value}px`,
}));
const editorGutterStyle = computed(() => ({
    width: `${editorGutterWidth.value}px`,
}));
const editorLineNumberListStyle = computed(() => ({
    transform: `translateY(-${editorScrollTop.value}px)`,
}));
const editorTextareaStyle = computed(() => ({
    paddingLeft: `${editorGutterWidth.value + 12}px`,
}));

const inputHint = computed(() => {
    if (lineLimitExceeded.value) return '评论行数超过 5000 行，请拆分后再审核。';
    if (hasTooLongLine.value) return '存在超过 1000 字的评论，请缩短后再审核。';
    if (commentLines.value.length === 0) return '空行会被忽略。';
    return `将审核 ${commentLines.value.length} 条评论，空行会被忽略。`;
});

const statusText = (status: string) => {
    switch (status) {
        case 'approved':
            return '已通过';
        case 'rejected':
            return '已拒绝';
        default:
            return '待审核';
    }
};

const statusTagType = (status: string) => {
    switch (status) {
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
        default:
            return 'warning';
    }
};

const moderationDecisionText = (decision: string) => {
    switch (decision) {
        case 'evidence_baseline_reject':
            return '证据基线拒绝';
        case 'evidence_baseline_review':
            return '证据基线复核';
        case 'evidence_baseline_allow':
            return '证据基线通过';
        case 'disabled':
            return '审核已停用';
        case 'error':
            return '审核异常';
        case 'probability_allow':
            return '概率通过';
        case 'probability_review':
            return '概率复核';
        case 'probability_reject':
            return '概率拒绝';
		case 'human_feedback_exact':
			return '精确内容反馈覆盖';
		case 'human_feedback_relation':
			return '关系样本反馈覆盖';
        default:
            return decision || '-';
    }
};

const moderationSourceText = (source: string) => {
    switch (source) {
        case 'lexicon':
            return '敏感词库';
        case 'structure':
            return '结构规则';
        case 'context':
            return '上下文规则';
        case 'behavior':
            return '行为风险';
        case 'semantic':
            return '语义修正';
        case 'local_context':
            return '本地上下文';
        case 'similarity':
            return '相似度检测';
        default:
            return source || '-';
    }
};

const rewriteRoleText = (role?: ModerationRewriteCandidate['role']) => {
	switch (role) {
		case 'subject':
			return '对象词';
		case 'predicate':
			return '动作词';
		case 'concept':
			return '风险概念';
		default:
			return '-';
	}
};

const moderationCategoryLabels: Record<string, string> = {
	abuse: '辱骂攻击',
	benign_context: '良性语境',
	contact: '联系方式导流',
	decoded_url: '编码外链',
	drugs: '毒品风险',
	gambling: '赌博',
	gore: '血腥内容',
	hate: '仇恨排斥',
	harmful_value: '有害价值观',
	illegal_privacy: '违法与隐私',
	minor: '未成年人风险',
	political: '政治动员',
	risk_phrase: '风险短语',
	script_injection: '脚本注入',
	sensitive: '敏感风险',
	sexual: '色情低俗',
	spam_fraud: '垃圾与欺诈',
	text_quality: '文本质量',
	url: '外链风险',
	violence: '暴力威胁',
};

const fallbackFeedbackCategories = Object.keys(moderationCategoryLabels)
	.filter((category) => category !== 'benign_context');

const moderationCategoryText = (category?: string) => {
	return category ? moderationCategoryLabels[category] || category : '-';
};

const feedbackCategoryOptions = computed(() => {
	const categories = previewResult.value?.feedbackCategories?.length
		? previewResult.value.feedbackCategories
		: fallbackFeedbackCategories;
	return categories.map((value) => ({ value, label: moderationCategoryText(value) }));
});

const suggestedFeedbackCategory = (row?: ModerationPreviewRow | null) => {
	if (!row) return '';
	const allowed = new Set(feedbackCategoryOptions.value.map((item) => item.value));
	const probability = row.trace?.decisionEngine?.decision?.categoryProbabilities || {};
	const highestProbability = Object.entries(probability)
		.filter(([category]) => allowed.has(category))
		.sort((left, right) => right[1] - left[1])[0]?.[0];
	if (highestProbability) return highestProbability;
	return [...(row.signals || [])]
		.filter((signal) => Boolean(signal.category && allowed.has(signal.category)))
		.sort((left, right) => right.score - left.score)[0]?.category || '';
};

const moderationRelationSubtypeText = (subtype?: string) => {
	const labels: Record<string, string> = {
		self_harm_encouragement: '诱导自伤',
		dangerous_behavior_encouragement: '教唆危险行为',
		death_wish: '死亡诅咒',
		self_harm_expression: '自伤意图表达',
		risk_prevention: '危险行为劝阻',
		risk_education: '风险科普反证',
		stance_evaluation: '风险评价反证',
	};
	return subtype ? labels[subtype] || subtype : '-';
};

const moderationIntentText = (intent?: string) => {
	const labels: Record<string, string> = {
		actionable: '可执行风险行为', rejection: '拒绝风险行为', reporting: '引用或转述',
		risk_education: '风险科普', risk_evaluation: '风险评价', question: '询问', technical: '技术讨论',
		content_criticism: '内容批评', harmful_incitement: '有害行为诱导', self_harm_expression: '自伤意图表达',
		targeted_abuse: '定向辱骂', unknown: '未确定',
	};
	return intent ? labels[intent] || intent : '-';
};

const moderationRelationTypeText = (type?: string) => {
	const labels: Record<string, string> = { action: '行动', evaluation: '评价', expression: '表达' };
	return type ? labels[type] || type : '-';
};

const moderationRelationStanceText = (stance?: string) => {
	const labels: Record<string, string> = {
		actionable: '实施/推广', condemnation: '谴责', warning: '警示', rejection: '拒绝',
		reporting: '转述', self_concern: '自我风险',
	};
	return stance ? labels[stance] || stance : '-';
};

const moderationLevelText = (level?: string) => {
    switch (level) {
        case 'allow':
            return '通过';
        case 'notice':
            return '提示';
        case 'review':
            return '待复核';
        case 'block':
            return '建议拒绝';
        default:
            return level || '-';
    }
};

const probabilityText = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-';
    return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`;
};

const rewriteMethodText = (method?: string) => {
    const labels: Record<string, string> = {
        unicode_normalization: 'Unicode 归一化',
        separator_compaction: '分隔符压缩',
        confusable_skeleton: '形近字符骨架',
        url_decode: 'URL 解码',
        pinyin_initials: '拼音首字母',
        pinyin_full: '完整拼音',
        pinyin_homophone: '同音还原',
        pinyin_near: '近音还原',
        emoji_annotation: 'Emoji 概念标注',
    };
    return method ? labels[method] || method : '-';
};

const fallbackReasonText = (reason?: string) => {
    const labels: Record<string, string> = {
        context_analysis_disabled: '本地上下文分析已停用，保留证据基线结果。',
        context_analysis_error: '本地上下文分析失败，保留证据基线结果。',
        context_analyzer_unavailable: '本地上下文分析器不可用，保留证据基线结果。',
        context_analysis_unavailable: '本地上下文分析不可用，保留证据基线结果。',
        context_confidence_below_threshold: '本地分析置信度未达到接管阈值，保留证据基线结果。',
        hard_safety_signal: '存在不可被语义层覆盖的硬安全信号，保留原拒绝结果。',
    };
    return reason ? labels[reason] || reason : '-';
};

const probabilityEntries = (values?: Record<string, number>) => Object.entries(values || {})
    .map(([category, probability]) => ({ category, probability }))
    .sort((left, right) => right.probability - left.probability);

const reasonSummary = (row: ModerationPreviewRow) => {
    if (!row.reasons?.length) return '-';
    return row.reasons.join('；');
};

const formatEvaluatedAt = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
};

const executionContextText = (result?: ModerationPreviewResponse | null) => {
    if (!result?.context) return '未记录';
    const values: string[] = [];
    if (result.context.userID) values.push(`用户 ${result.context.userID}`);
    if (result.context.articleID) values.push(`文章 ${result.context.articleID}`);
    if (result.context.clientIPProvided) values.push('客户端 IP');
    if (result.context.articleTitleProvided) values.push('文章标题');
    if (result.context.articleCategoryProvided) values.push('文章分类');
    if (result.context.parentContentProvided) values.push('父评论');
    if (result.context.replyContentProvided) values.push('被回复评论');
    return values.length ? values.join('、') : '未提供额外上下文';
};

const dedupReasonText = (reason?: string) => {
    const labels: Record<string, string> = {
        stronger_correlated_evidence: '同一相关组中存在更强证据',
        weaker_correlated_evidence: '强度不高于已保留证据',
    };
    return reason ? labels[reason] || reason : '-';
};

const behaviorStatusText = (trace?: ModerationBehaviorTrace) => {
    if (!trace) return '没有行为检测记录';
    switch (trace.status) {
        case 'executed':
            return trace.readOnly ? '已只读执行，未写入行为统计' : '已执行';
        case 'skipped':
            return trace.unavailableReason === 'behavior_context_insufficient'
                ? '提供的上下文不足以计算行为指标，已跳过'
                : '未提供可用的用户、文章或 IP 上下文，已跳过';
        case 'unavailable':
            return '行为存储不可用，未完成检测';
        case 'failed':
            return '行为数据查询失败，未完成检测';
        default:
            return trace.unavailableReason || trace.status || '-';
    }
};

const behaviorMetricText = (name: string) => {
    const labels: Record<string, string> = {
        user_frequency: '用户评论频率',
        ip_frequency: 'IP 评论频率',
        duplicate_content: '完全重复内容',
        near_duplicate: '近似重复内容',
    };
    return labels[name] || name;
};

const behaviorMetricReasonText = (reason?: string) => {
    const labels: Record<string, string> = {
        user_id_not_provided: '未提供用户 ID',
        client_ip_not_provided: '未提供客户端 IP',
        user_or_article_not_provided: '需要同时提供用户 ID 和文章 ID',
        near_duplicate_disabled: '近重复规则已停用',
    };
    return reason ? labels[reason] || reason : '-';
};

const durationText = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '-';
    if (seconds % 86400 === 0) return `${seconds / 86400} 天`;
    if (seconds % 3600 === 0) return `${seconds / 3600} 小时`;
    if (seconds % 60 === 0) return `${seconds / 60} 分钟`;
    return `${seconds} 秒`;
};

type DecisionStageState = 'baseline' | 'changed' | 'retained' | 'checked' | 'blocked' | 'error' | 'waiting' | 'skipped' | 'final';
interface DecisionFlowStage {
    key: string;
    title: string;
    state: DecisionStageState;
	badge: string;
    snapshot: ModerationDecisionSnapshot;
    description: string;
}

const stageTagType = (state: DecisionStageState) => {
    switch (state) {
        case 'changed':
            return 'success';
        case 'blocked':
		case 'error':
            return 'danger';
		case 'waiting':
			return 'warning';
        case 'final':
            return 'primary';
        default:
            return 'info';
    }
};

const decisionSnapshotChanged = (
	before?: ModerationDecisionSnapshot,
	after?: ModerationDecisionSnapshot,
) => Boolean(before && after && (
	before.status !== after.status || before.score !== after.score || before.decision !== after.decision
));

const probabilityApplicationText = (stage: ModerationDecisionApplication) => {
	if (!stage?.evaluated) return '未评估';
	if (!stage.applied) return '已评估，未接管';
	return decisionSnapshotChanged(stage.before, stage.after) ? '已接管并改变结果' : '已接管，结果相同';
};

const feedbackReasonText = (reason?: string) => {
    const labels: Record<string, string> = {
        feedback_store_unavailable: '反馈存储不可用',
        feedback_lookup_failed: '反馈策略查询失败',
        no_matching_feedback: '没有命中历史人工反馈',
        feedback_no_consensus: '已有反馈尚未形成多数共识',
        feedback_support_below_minimum: '关系反馈支持样本不足',
        feedback_status_invalid: '反馈目标状态无效',
        hard_safety_signal: '硬安全信号禁止降级',
    };
    return reason ? labels[reason] || reason : '';
};

const decisionFlowStages = (row: ModerationPreviewRow): DecisionFlowStage[] => {
    const flow = row.trace?.decisions;
    if (!flow) {
        return [{
            key: 'final', title: '最终结果', state: 'final', badge: '最终结果',
            snapshot: { status: row.status, score: row.riskScore, decision: row.decision },
            description: '当前响应没有结构化决策链。',
        }];
    }
    const probability = flow.probability;
    const hardSafety = flow.hardSafety;
    const feedback = flow.feedback;
    const feedbackScope = feedback.scope === 'exact' ? '精确内容' : '关系指纹';
    const feedbackStats = feedback.matched
        ? `${feedbackScope}反馈：支持 ${feedback.support}/${feedback.total}，冲突 ${feedback.conflicts}；模拟 ${feedback.simulationSupport}，真实 ${feedback.liveSupport}`
		: '';
	const feedbackReason = feedbackReasonText(feedback.reason);
	const probabilityChanged = probability.applied && decisionSnapshotChanged(probability.before, probability.after);
	const probabilityState: DecisionStageState = !probability.evaluated
		? 'skipped'
		: probability.applied
			? probabilityChanged ? 'changed' : 'retained'
			: 'checked';
	const probabilityBadge = !probability.evaluated
		? '未评估'
		: probability.applied
			? probabilityChanged ? '已接管 · 已改变' : '已接管 · 结果相同'
			: '已评估 · 未接管';
	const feedbackChanged = feedback.applied && decisionSnapshotChanged(feedback.before, feedback.after);
	const feedbackFailed = feedback.reason === 'feedback_lookup_failed' || feedback.reason === 'feedback_store_unavailable';
	const feedbackState: DecisionStageState = feedbackFailed
		? 'error'
		: !feedback.evaluated
			? 'skipped'
			: feedback.applied
				? feedbackChanged ? 'changed' : 'retained'
				: feedback.matched
					? feedback.reason === 'hard_safety_signal' ? 'blocked' : 'waiting'
					: 'checked';
	const feedbackBadge = feedbackFailed
		? '查询失败'
		: !feedback.evaluated
			? '未查询'
			: feedback.applied
				? feedbackChanged ? '已接管 · 已改变' : '已接管 · 结果相同'
				: feedback.matched
					? feedback.reason === 'hard_safety_signal' ? '已匹配 · 禁止降级' : '已匹配 · 尚未生效'
					: '已查询 · 无匹配';
    return [
        {
            key: 'rule', title: '证据基线', state: 'baseline', badge: '基线结果', snapshot: flow.rule,
            description: '探测器信号经过去重、分句语义抑制和统一证据校准后形成的上下文无关结果。',
        },
        {
            key: 'probability', title: '证据融合',
            state: probabilityState,
			badge: probabilityBadge,
			snapshot: probability.after?.status ? probability.after : probability.before,
            description: probability.applied
				? probabilityChanged
					? `融合候选满足接管条件，并把结果从“${statusText(probability.before.status)}”调整为“${statusText(probability.after.status)}”。`
					: '融合候选满足接管条件，但状态、分值和决策代码与规则基线相同。'
				: probability.evaluated
					? `已完成概率计算，但候选没有接管当前结果：${fallbackReasonText(probability.reason)}`
					: fallbackReasonText(probability.reason),
        },
        {
            key: 'hard-safety', title: '硬安全保护',
			state: hardSafety.triggered ? 'blocked' : hardSafety.evaluated ? 'checked' : 'skipped',
			badge: hardSafety.triggered ? '已触发 · 阻断降级' : hardSafety.evaluated ? '已检查 · 未触发' : '未检查',
            snapshot: hardSafety.after?.status ? hardSafety.after : probability.after,
            description: hardSafety.triggered
                ? `命中 ${hardSafety.ruleID || '硬安全规则'}，禁止低风险结果覆盖原拒绝。`
				: hardSafety.evaluated ? '已完成不可降级规则检查，没有触发硬安全保护。' : '本次决策没有执行硬安全检查。',
        },
        {
            key: 'feedback', title: '人工反馈策略',
			state: feedbackState,
			badge: feedbackBadge,
			snapshot: feedback.after?.status ? feedback.after : feedback.before,
            description: feedback.applied
				? `${feedbackStats}；${feedbackChanged ? '已改变前序结果。' : '已接管决策，但结果与前序一致。'}`
				: [feedbackStats, feedbackReason].filter(Boolean).join('；'),
        },
        {
            key: 'final', title: '最终决定', state: 'final', badge: '最终结果', snapshot: flow.final,
            description: '该状态、分值和决策代码是本次审核的唯一权威结果。',
        },
    ];
};

const handleResultFilterChange = () => {
    resultCurrentPage.value = 1;
};

const setResultStatusFilter = (command: string | number | object) => {
    resultStatusFilter.value = String(command) as ResultStatusFilter;
    handleResultFilterChange();
};

const clampInputPanelWidth = (width: number) => {
	const rect = workbenchRef.value?.getBoundingClientRect();
	const maxWidth = rect
		? Math.max(INPUT_PANEL_MIN_WIDTH, Math.min(rect.width * 0.5, rect.width - RESULT_PANEL_MIN_WIDTH - RESIZER_WIDTH))
		: width;
	return Math.min(Math.max(width, INPUT_PANEL_MIN_WIDTH), maxWidth);
};
const clampedInputPanelWidth = computed(() => clampInputPanelWidth(inputPanelWidth.value));
const workbenchStyle = computed(() => ({
	gridTemplateColumns: `${clampedInputPanelWidth.value}px ${RESIZER_WIDTH}px minmax(0, 1fr)`,
}));

const handleResize = (event: MouseEvent) => {
	const rect = workbenchRef.value?.getBoundingClientRect();
	if (!rect) return;
	const nextWidth = clampInputPanelWidth(event.clientX - rect.left);
	inputPanelWidth.value = nextWidth;
};

const stopResize = () => {
	resizing.value = false;
	window.removeEventListener('mousemove', handleResize);
	window.removeEventListener('mouseup', stopResize);
};

const startResize = (event: MouseEvent) => {
	event.preventDefault();
	resizing.value = true;
	window.addEventListener('mousemove', handleResize);
	window.addEventListener('mouseup', stopResize);
};

const focusEditor = () => {
    editorRef.value?.focus();
};

const handleEditorScroll = () => {
    editorScrollTop.value = editorRef.value?.scrollTop || 0;
};

const lineCountOf = (value: string) => (value === '' ? 0 : value.split(/\r?\n/).length);

const nextEditorValue = (insertText: string) => {
    const editor = editorRef.value;
    if (!editor) return rawInput.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    return `${rawInput.value.slice(0, start)}${insertText}${rawInput.value.slice(end)}`;
};

const notifyLineLimit = () => {
    ElNotification({
        title: 'Failed',
        message: `评论行数不能超过 ${MAX_COMMENT_LINES} 行，空行也会计入。`,
        type: 'warning',
    });
};

const preventIfLineLimitExceeded = (event: Event, insertText: string) => {
    if (lineCountOf(nextEditorValue(insertText)) <= MAX_COMMENT_LINES) return false;
    event.preventDefault();
    notifyLineLimit();
    return true;
};

const handleEditorBeforeInput = (event: InputEvent) => {
    if (event.inputType.startsWith('delete')) return;
    if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
        preventIfLineLimitExceeded(event, '\n');
        return;
    }
    if (event.data) {
        preventIfLineLimitExceeded(event, event.data);
    }
};

const handleEditorPaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text') || '';
    if (text) {
        preventIfLineLimitExceeded(event, text);
    }
};

const updateActiveInputLine = () => {
    const editor = editorRef.value;
    if (!editor) return;
    activeInputLine.value = rawInput.value.slice(0, editor.selectionStart).split(/\r?\n/).length;
    handleEditorScroll();
};

const handleEditorInput = () => {
    updateActiveInputLine();
};

const lineStartOffset = (line: number) => {
    const lines = rawInput.value.split('\n');
    const targetLine = Math.max(1, Math.min(line, lines.length));
    let offset = 0;
    for (let index = 0; index < targetLine - 1; index += 1) {
        offset += lines[index].length + 1;
    }
    return offset;
};

const focusInputLine = (line: number) => {
    activeInputLine.value = Math.max(1, line);
    nextTick(() => {
        const editor = editorRef.value;
        if (!editor) return;
        const offset = lineStartOffset(line);
        editor.focus();
        editor.setSelectionRange(offset, offset);
        editor.scrollTop = Math.max(0, (activeInputLine.value - 1) * EDITOR_LINE_HEIGHT - EDITOR_LINE_HEIGHT * 4);
        handleEditorScroll();
    });
};

const resetPreview = () => {
    rawInput.value = '';
    previewResult.value = null;
    resultStatusFilter.value = '';
    resultContentKeyword.value = '';
    resultCurrentPage.value = 1;
    resultPageSize.value = 20;
    selectedRow.value = null;
    detailDrawer.value = false;
    signalStage.value = 'final';
    behaviorUserID.value = '';
    behaviorArticleID.value = '';
    behaviorClientIP.value = '';
    semanticArticleTitle.value = '';
    semanticArticleCategory.value = '';
    semanticParentContent.value = '';
    semanticReplyToContent.value = '';
    activeInputLine.value = 1;
    editorScrollTop.value = 0;
};

const openDetail = (row: ModerationPreviewRow) => {
    selectedRow.value = row;
    signalStage.value = 'final';
    detailDrawer.value = true;
    focusInputLine(row.line);
};

const openFeedbackDialog = () => {
	if (!selectedRow.value?.auditID) {
		ElNotification({ title: 'Failed', message: '当前结果没有审计记录', type: 'warning' });
		return;
	}
	feedbackForm.value = {
		expectedStatus: selectedRow.value.status,
		expectedCategory: selectedRow.value.status === 'approved'
			? ''
			: suggestedFeedbackCategory(selectedRow.value),
		note: '',
	};
	feedbackDialog.value = true;
};

const submitFeedback = async () => {
	if (!selectedRow.value?.auditID || feedbackSubmitting.value) return;
	const expectedCategory = feedbackForm.value.expectedStatus === 'approved'
		? ''
		: feedbackForm.value.expectedCategory.trim();
	if (feedbackForm.value.expectedStatus !== 'approved' && !expectedCategory) {
		ElNotification({ title: '分类未选择', message: '待审核或已拒绝必须选择一个主要风险分类', type: 'warning' });
		return;
	}
	if (expectedCategory && !feedbackCategoryOptions.value.some((item) => item.value === expectedCategory)) {
		ElNotification({ title: '分类无效', message: '请选择后端提供的审核分类', type: 'warning' });
		return;
	}
	feedbackSubmitting.value = true;
	try {
		const response = await _axios.post('/admin/auth/comment/moderation-feedback', {
			auditID: selectedRow.value.auditID,
			expectedStatus: feedbackForm.value.expectedStatus,
			expectedCategory,
			note: feedbackForm.value.note.trim(),
		});
		const { code, message } = response.data;
		if (code !== 2000 || message !== '') {
			ElNotification({ title: 'Failed', message: message || '保存审核反馈失败', type: 'error' });
			return;
		}
		feedbackDialog.value = false;
		ElNotification({
			title: 'Success',
			message: '反馈已确认，将参与真实评论的后续决策',
			type: 'success',
		});
	} catch (error: any) {
		ElNotification({ title: 'Error', message: error?.message ?? String(error), type: 'error' });
	} finally {
		feedbackSubmitting.value = false;
	}
};

const runPreview = async () => {
    if (!canSubmit.value) {
        ElNotification({
            title: 'Failed',
            message: inputHint.value,
            type: 'warning',
        });
        return;
    }

    loading.value = true;
    try {
        const submittedEntries = [...commentEntries.value];
        const response = await _axios.post('/admin/auth/comment/moderation-preview', {
            comments: submittedEntries.map((item) => item.content),
            userID: behaviorUserID.value.trim(),
            articleID: behaviorArticleID.value.trim(),
            clientIP: behaviorClientIP.value.trim(),
            articleTitle: semanticArticleTitle.value.trim(),
            articleCategory: semanticArticleCategory.value.trim(),
            parentContent: semanticParentContent.value.trim(),
            replyToContent: semanticReplyToContent.value.trim(),
        });
        const { code, message, data } = response.data;
        if (code === 2000 && message === '') {
            previewResult.value = {
                ...data,
                rows: (data.rows || []).map((row: ModerationPreviewRow) => ({
                    ...row,
                    line: submittedEntries[row.line - 1]?.line || row.line,
                })),
            };
            resultStatusFilter.value = '';
            resultContentKeyword.value = '';
            resultCurrentPage.value = 1;
            selectedRow.value = null;
            detailDrawer.value = false;
            return;
        }
        ElNotification({
            title: 'Failed',
            message: message || '审核模拟失败',
            type: 'error',
        });
    } catch (error: any) {
        ElNotification({
            title: 'Error',
            message: error?.message ?? String(error),
            type: 'error',
        });
    } finally {
        loading.value = false;
    }
};

onBeforeUnmount(() => {
	stopResize();
});

watch([() => filteredPreviewRows.value.length, resultPageSize], () => {
    if (resultCurrentPage.value > maxResultPage.value) {
        resultCurrentPage.value = maxResultPage.value;
    }
});

watch(() => feedbackForm.value.expectedStatus, (status, previousStatus) => {
	if (status === 'approved') {
		feedbackForm.value.expectedCategory = '';
		return;
	}
	if (previousStatus === 'approved' && !feedbackForm.value.expectedCategory) {
		feedbackForm.value.expectedCategory = suggestedFeedbackCategory(selectedRow.value);
	}
});
</script>

<style scoped>
.moderation-page {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: #f5f7fa;
}

.moderation-workbench {
    display: grid;
    height: 100%;
    min-height: 0;
    gap: 0;
    padding: 0;
}

.moderation-workbench.is-resizing {
    cursor: col-resize;
    user-select: none;
}

.input-panel,
.result-panel {
    min-height: 0;
    border: 0;
    border-radius: 0;
    background: #fff;
}

.input-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.panel-header {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--admin-header-height, 48px);
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    border-bottom: 1px solid #ebeef5;
}

.panel-tools {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
}

:global(.behavior-context-form) {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

:global(.behavior-context-form p) {
    margin: 0 0 2px;
    color: #606266;
    font-size: 12px;
    line-height: 1.6;
}

.panel-title {
    color: #303133;
    font-size: 16px;
    font-weight: 400;
}

.panel-header p {
    margin: 6px 0 0;
    color: #909399;
    font-size: 12px;
    line-height: 1.6;
}

.editor-shell {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: #fff;
}

.editor-body {
    position: relative;
    flex: 1;
    min-height: 360px;
    overflow: hidden;
    background: #fff;
}

.editor-active-line {
    position: absolute;
    right: 0;
    left: 0;
    z-index: 0;
    height: 24px;
    background: #ecf5ff;
    pointer-events: none;
}

.editor-gutter {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    overflow: hidden;
    border-right: 1px solid #ebeef5;
    background: #f8fafc;
    color: #a8abb2;
    font-family: monospace;
    font-size: 12px;
    line-height: 24px;
    pointer-events: none;
    user-select: none;
}

.editor-line-number-list {
    padding-top: 10px;
    will-change: transform;
}

.editor-line-number {
    height: 24px;
    box-sizing: border-box;
    padding: 0 8px 0 6px;
    text-align: right;
}

.editor-line-number.is-active {
    color: #606266;
    font-weight: 600;
}

.editor-textarea {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 0;
    background: transparent;
    color: #303133;
    font-family: monospace;
    font-size: 13px;
    line-height: 24px;
    outline: none;
    overflow: auto;
    resize: none;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
}

.editor-textarea::placeholder {
    color: #c0c4cc;
}

.input-actions {
    display: flex;
    height: 46px;
    flex: 0 0 46px;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    box-sizing: border-box;
    padding: 0 14px;
    border-top: 1px solid #ebeef5;
}

.action-group {
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
}

.result-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
}

.result-toolbar {
    display: flex;
    height: var(--admin-header-height, 48px);
    flex: 0 0 var(--admin-header-height, 48px);
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-sizing: border-box;
    padding: 0 14px;
    border-bottom: 1px solid #ebeef5;
    background: #fff;
}

.result-title {
    color: #303133;
    font-size: 16px;
    font-weight: 400;
}

.result-heading {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
}

.result-run-meta {
    max-width: 420px;
    overflow: hidden;
    color: #909399;
    font-family: monospace;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.result-search {
    width: min(360px, 48%);
    flex: 0 1 360px;
}

.workbench-resizer {
    position: relative;
    background: #e4e7ed;
    cursor: col-resize;
}

.workbench-resizer span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 44px;
    border-radius: 999px;
    background: #c0c4cc;
    transform: translate(-50%, -50%);
    transition: background-color 0.2s;
}

.workbench-resizer:hover span,
.moderation-workbench.is-resizing .workbench-resizer span {
    background: #409eff;
}

.result-table {
    flex: 1;
    min-height: 0;
    font-family: monospace;
}

:deep(.result-table .el-table__header-wrapper th .cell) {
    display: flex;
    align-items: center;
    min-height: 32px;
    line-height: 32px;
}

:deep(.result-table .el-table__header-wrapper th.el-table__cell) {
    padding: 4px 0;
}

:deep(.result-table .el-dropdown) {
    display: inline-flex;
    align-items: center;
}

.status-filter-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #909399;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    line-height: 24px;
}

.status-filter-trigger:hover {
    color: #606266;
}

.status-filter-caret {
    width: 0;
    height: 0;
    border-top: 5px solid #909399;
    border-right: 4px solid transparent;
    border-left: 4px solid transparent;
    transition: border-top-color 0.2s;
}

.status-filter-trigger:hover .status-filter-caret {
    border-top-color: #606266;
}

:global(.el-dropdown-menu__item.is-selected) {
    color: #409eff;
    font-weight: 600;
}

.result-pagination {
    display: flex;
    height: 46px;
    flex: 0 0 46px;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    padding: 0 14px;
    border-top: 1px solid #ebeef5;
    background: #fff;
}

.content-cell {
    color: #303133;
}

.line-jump-button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #409eff;
    cursor: pointer;
    font-family: monospace;
}

.line-jump-button:hover {
    color: #337ecc;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.detail-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #303133;
    font-family: monospace;
}

.detail-meta-panel {
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    background: #fff;
}

.detail-meta-row {
    display: flex;
    min-width: 0;
    gap: 14px;
    padding: 10px 14px;
    border-bottom: 1px solid #f0f2f5;
}

.detail-meta-row:last-child {
    border-bottom: 0;
}

.detail-meta-label {
    width: 66px;
    flex: 0 0 66px;
    color: #909399;
    font-size: 12px;
    line-height: 22px;
}

.detail-meta-value {
    min-width: 0;
    color: #303133;
    font-size: 13px;
    line-height: 22px;
}

.detail-section {
    padding: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
}

.detail-section--reasons {
    background: linear-gradient(180deg, #fff8f0 0%, #fff 100%);
}

.detail-section--decision-engine {
    background: linear-gradient(180deg, #f3f9ff 0%, #fff 100%);
}

.detail-section--decision-flow {
    background: linear-gradient(180deg, #f4f9ff 0%, #fff 100%);
}

.detail-section--behavior {
    background: linear-gradient(180deg, #f5fbf8 0%, #fff 100%);
}

.decision-flow-list {
    display: flex;
    flex-direction: column;
}

.decision-flow-item {
    position: relative;
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 10px;
    padding-bottom: 14px;
}

.decision-flow-item:not(:last-child)::before {
    position: absolute;
    top: 12px;
    bottom: -2px;
    left: 5px;
    width: 1px;
    background: #dcdfe6;
    content: '';
}

.decision-flow-marker {
    position: relative;
    z-index: 1;
    width: 10px;
    height: 10px;
    margin-top: 6px;
    border: 2px solid #c0c4cc;
    border-radius: 50%;
    background: #fff;
}

.decision-flow-item.is-changed .decision-flow-marker {
    border-color: #67c23a;
    background: #f0f9eb;
}

.decision-flow-item.is-baseline .decision-flow-marker,
.decision-flow-item.is-retained .decision-flow-marker,
.decision-flow-item.is-checked .decision-flow-marker {
	border-color: #909399;
	background: #f4f4f5;
}

.decision-flow-item.is-waiting .decision-flow-marker {
	border-color: #e6a23c;
	background: #fdf6ec;
}

.decision-flow-item.is-blocked .decision-flow-marker,
.decision-flow-item.is-error .decision-flow-marker {
    border-color: #f56c6c;
    background: #fef0f0;
}

.decision-flow-item.is-final .decision-flow-marker {
    border-color: #409eff;
    background: #ecf5ff;
}

.decision-flow-main {
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    background: #fff;
}

.decision-flow-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.decision-flow-heading strong {
    font-size: 13px;
    font-weight: 500;
}

.decision-flow-main p {
    margin: 7px 0 3px;
    color: #303133;
    font-size: 12px;
    line-height: 1.6;
}

.decision-flow-main > span {
    color: #909399;
    font-size: 11px;
    line-height: 1.6;
}

.decision-engine-summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
}

.decision-engine-summary-grid > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
    padding: 9px 10px;
    border: 1px solid #d9ecff;
    border-radius: 4px;
    background: #fff;
}

.decision-engine-summary-grid span,
.decision-engine-subsection-title {
    color: #909399;
    font-size: 12px;
}

.probability-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.probability-chip-list span {
    padding: 4px 8px;
    border: 1px solid #b3d8ff;
    border-radius: 999px;
    background: #ecf5ff;
    color: #337ecc;
    font-size: 12px;
}

.fusion-thresholds {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}

.fusion-thresholds span {
    padding: 4px 8px;
    border: 1px solid #d9ecff;
    border-radius: 4px;
    background: #fff;
    color: #606266;
    font-size: 11px;
}

.dedup-summary {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    background: #fafafa;
    color: #606266;
    font-size: 11px;
    line-height: 1.6;
}

.dedup-table {
    margin-top: 8px;
}

.decision-engine-summary-grid strong {
    overflow: hidden;
    color: #303133;
    font-size: 13px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.decision-engine-subsection-title {
    margin: 16px 0 8px;
}

.context-assessment {
    padding: 10px 12px;
    border: 1px solid #d9ecff;
    border-radius: 4px;
    background: #fff;
}

.context-assessment p {
    margin: 0 0 6px;
    line-height: 1.7;
}

.context-assessment p:last-child {
    margin-bottom: 0;
}

.detail-section-title {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    color: #303133;
    font-size: 14px;
    font-weight: 400;
}

.detail-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
}

.detail-section-header .detail-section-title {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: 0;
}

.clause-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.clause-item {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 10px;
    padding: 9px 10px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #fff;
}

.clause-id {
    color: #409eff;
    font-size: 12px;
    line-height: 1.7;
}

.clause-item p {
    min-width: 0;
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
}

.detail-content {
    margin: 0;
    color: #303133;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
}

.reason-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.reason-chip {
    display: inline-flex;
    max-width: 100%;
    padding: 4px 8px;
    border: 1px solid #f3d19e;
    border-radius: 4px;
    background: #fff;
    color: #7d4b00;
    font-size: 12px;
    line-height: 1.6;
    word-break: break-word;
}

.raw-reason-details {
    margin-top: 12px;
    color: #909399;
    font-size: 11px;
}

.raw-reason-details summary {
    cursor: pointer;
}

.raw-reason-details code {
    display: block;
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 3px;
    background: #f5f7fa;
    color: #606266;
    overflow-wrap: anywhere;
}

.signal-table {
    font-size: 12px;
}

.text-grid {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 4px;
}

.text-row {
    display: flex;
    min-width: 0;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f2f5;
}

.text-row:last-child {
    border-bottom: 0;
}

.text-row span {
    width: 66px;
    flex: 0 0 66px;
    color: #909399;
    font-size: 12px;
    line-height: 22px;
}

.text-row p {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    color: #303133;
    font-size: 13px;
    line-height: 22px;
    white-space: pre-wrap;
    word-break: break-word;
}

:global(.moderation-feedback-dialog .el-dialog__header) {
	margin-right: 0;
	padding: 22px 24px 16px;
	border-bottom: 1px solid #ebeef5;
}

:global(.moderation-feedback-dialog .el-dialog__body) {
	padding: 18px 24px 8px;
}

:global(.moderation-feedback-dialog .el-dialog__footer) {
	padding: 14px 24px 20px;
	border-top: 1px solid #ebeef5;
}

.feedback-dialog-title {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.feedback-dialog-title strong {
	color: #303133;
	font-size: 18px;
	font-weight: 500;
}

.feedback-dialog-title span {
	color: #909399;
	font-size: 12px;
}

.feedback-context-card {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 12px 20px;
	margin: 14px 0 18px;
	padding: 12px 14px;
	border: 1px solid #e4e7ed;
	border-radius: 6px;
	background: #fafafa;
}

.feedback-context-card > div {
	display: flex;
	min-width: 0;
	align-items: center;
	gap: 10px;
}

.feedback-context-card > div > span {
	flex: 0 0 auto;
	color: #909399;
	font-size: 12px;
}

.feedback-context-card strong {
	overflow: hidden;
	color: #303133;
	font-family: monospace;
	font-size: 12px;
	font-weight: 500;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.feedback-context-card p {
	grid-column: 1 / -1;
	display: -webkit-box;
	overflow: hidden;
	margin: 0;
	color: #606266;
	font-size: 13px;
	line-height: 1.7;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
    line-clamp: 2;
}

.feedback-form :deep(.el-form-item) {
	margin-bottom: 18px;
}

.feedback-form :deep(.el-form-item__label) {
	margin-bottom: 7px;
	color: #303133;
	font-weight: 500;
}

.feedback-status-group {
	display: flex;
	width: 100%;
}

.feedback-status-group :deep(.el-radio-button) {
	flex: 1;
}

.feedback-status-group :deep(.el-radio-button__inner) {
	width: 100%;
}

.feedback-field-help {
	width: 100%;
	margin-top: 6px;
	color: #909399;
	font-size: 11px;
	line-height: 1.5;
}

.feedback-dialog-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
}

.feedback-dialog-footer > span {
	max-width: 300px;
	color: #909399;
	font-size: 11px;
	line-height: 1.5;
	text-align: left;
}

.feedback-dialog-footer > div {
	display: flex;
	flex: 0 0 auto;
	gap: 8px;
}

@media (max-width: 640px) {
	.feedback-context-card {
		grid-template-columns: 1fr;
	}

	.feedback-context-card p {
		grid-column: 1;
	}

	.feedback-dialog-footer {
		align-items: stretch;
		flex-direction: column;
	}

	.feedback-dialog-footer > span {
		max-width: none;
	}

	.feedback-dialog-footer > div {
		justify-content: flex-end;
	}
}
</style>
