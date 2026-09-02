export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface ModerationPreviewText {
    raw: string;
    normalized: string;
    compact: string;
    confusable?: string;
    decodedTexts?: string[];
}

export interface ModerationPreviewSignal {
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

export interface ModerationEvidence {
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

export interface ModerationRelation {
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

export interface ModerationDecisionSnapshot {
    status: CommentStatus;
    score: number;
    decision: string;
}

export interface ModerationDecisionApplication {
    evaluated: boolean;
    applied: boolean;
    before: ModerationDecisionSnapshot;
    candidate: ModerationDecisionSnapshot;
    after: ModerationDecisionSnapshot;
    reason?: string;
}

export interface ModerationDecisionFlow {
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

export interface ModerationPreviewRow {
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
    trace: {
        clauses: Array<{ id: number; text: ModerationPreviewText }>;
        detectorSignals?: ModerationPreviewSignal[];
        suppressedSignals?: ModerationPreviewSignal[];
        behavior?: {
            status: 'executed' | 'skipped' | 'unavailable' | 'failed';
            readOnly: boolean;
            contextProvided: boolean;
            unavailableReason?: string;
            metrics?: Array<{
                name: string;
                evaluated: boolean;
                observedCount: number;
                prospectiveCount: number;
                windowSeconds: number;
                reviewThreshold: number;
                blockThreshold?: number;
                triggeredLevel?: string;
                skippedReason?: string;
            }>;
        };
        decisionEngine?: {
            candidates?: Array<{
                text: string;
                observed?: string;
                category?: string;
                role?: 'concept' | 'subject' | 'predicate';
                method: string;
                confidence: number;
                ambiguous: boolean;
                rationale?: string;
                clauseID?: number;
            }>;
            evidence?: ModerationEvidence[];
            context: {
                analyzed: boolean;
                confidence: number;
                intent?: string;
                benignProbability: number;
                evidence?: ModerationEvidence[];
                relations?: ModerationRelation[];
                explanation?: string;
                unavailableReason?: string;
            };
            fusion: {
                thresholds: { approveMax: number; rejectMin: number; minConfidence: number };
                categories?: Array<{
                    category: string;
                    ruleRisk: number;
                    contextRisk: number;
                    contextCovered: boolean;
                    contextWeight: number;
                    contentRisk: number;
                    behaviorRisk: number;
                    counterEvidence: number;
                    finalRisk: number;
                }>;
                inputCount: number;
                outputCount: number;
                deduplicated?: Array<{ discarded: ModerationEvidence; keptID: string; reason: string }>;
            };
            decision: {
                status: CommentStatus;
                riskProbability: number;
                confidence: number;
                decision: string;
                calibration: string;
                categoryProbabilities?: Record<string, number>;
                actionable: boolean;
                fallbackReason?: string;
            };
        };
        decisions: ModerationDecisionFlow;
    };
}

export interface ModerationAuditMeta {
    auditID: string;
    source: string;
    policyVersion: string;
    evaluatedAt: string;
    context?: {
        userID?: string;
        articleID?: string;
        clientIPProvided: boolean;
        articleTitleProvided: boolean;
        articleCategoryProvided: boolean;
        parentContentProvided: boolean;
        replyContentProvided: boolean;
    };
}
