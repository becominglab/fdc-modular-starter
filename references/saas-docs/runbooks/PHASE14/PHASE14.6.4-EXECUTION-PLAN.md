# Phase 14.6.4: 4並列実行計画

## 対象ファイル (50ファイル / テスト除く)

Phase 14.6.3で分割済みのファイルは除外済み。

---

## Worker A: ViewModel専任 (8ファイル / 4,301行)

| # | ファイル | 行数 | パス |
|---|---------|------|------|
| 1 | useSADashboardViewModel.ts | 640 | lib/hooks/ |
| 2 | useBrandViewModel.ts | 636 | lib/hooks/ |
| 3 | useLeanCanvasViewModel.ts | 608 | lib/hooks/ |
| 4 | useClientsViewModel.ts | 580 | lib/hooks/ |
| 5 | useActionMapViewModel.ts | 560 | lib/hooks/action-map/ |
| 6 | useHabitLogic.ts | 456 | lib/hooks/task/ |
| 7 | useOKRViewModel.ts | 444 | lib/hooks/okr/ |
| 8 | useZoomScriptViewModel.ts | 432 | lib/hooks/ |

**分割方針**: 各ViewModelをCRUD/Filters/Export/Analysisに分割

---

## Worker B: Component専任 (15ファイル / 6,843行)

| # | ファイル | 行数 | パス |
|---|---------|------|------|
| 1 | UnifiedCSVSection.tsx | 589 | app/_components/admin/admin-tab/ |
| 2 | TemplateManager.tsx | 560 | app/_components/settings/ |
| 3 | TenantDetailModal.tsx | 507 | app/_components/admin/sa-dashboard/ |
| 4 | emailCategories.tsx | 497 | app/_components/email/email-script/ |
| 5 | HabitSlot.tsx | 489 | app/_components/todo/ |
| 6 | CSVImportExport.tsx | 460 | app/_components/common/ |
| 7 | CreateTenantModal.tsx | 457 | app/_components/admin/sa-dashboard/ |
| 8 | invite/[token]/page.tsx | 455 | app/invite/[token]/ |
| 9 | EditTenantModal.tsx | 449 | app/_components/admin/sa-dashboard/ |
| 10 | ProductsSection.tsx | 448 | app/_components/lean-canvas/lean-canvas/ |
| 11 | SADashboard.tsx | 446 | app/_components/admin/ |
| 12 | WorkspaceMembersModal.tsx | 441 | app/_components/admin/sa-dashboard/ |
| 13 | DepartmentsTab.tsx | 422 | app/_components/admin/org-management/ |
| 14 | UsersManagementTable.tsx | 416 | app/_components/admin/sa-dashboard/ |
| 15 | ZoomScriptTab.tsx | 413 | app/_components/zoom/ |
| 16 | TodoCard.tsx | 412 | app/_components/todo/ |
| 17 | LostProspectsSection.tsx | 409 | app/_components/clients/clients/ |
| 18 | JourneyFunnel.tsx | 405 | app/_components/reports/ |
| 19 | useTaskViewModel.ts | 403 | lib/hooks/task/ |

**分割方針**: 各コンポーネントをContainer/List/Form/Detailsに分割

---

## Worker C: Service + API専任 (11ファイル / 5,138行)

| # | ファイル | 行数 | パス |
|---|---------|------|------|
| 1 | sync-engine.ts | 592 | lib/google/ |
| 2 | calendar-client.ts | 527 | lib/google/ |
| 3 | google/sync/route.ts | 523 | app/api/google/sync/ |
| 4 | data/route.ts | 520 | app/api/workspaces/[workspaceId]/ |
| 5 | org-chart-service.ts | 499 | lib/server/ |
| 6 | sync-queue.ts | 480 | lib/server/ |
| 7 | google/tasks/sync/route.ts | 470 | app/api/google/tasks/sync/ |
| 8 | google/tasks/route.ts | 432 | app/api/google/tasks/ |
| 9 | api-utils.ts | 423 | lib/server/ |
| 10 | google/calendars/events/route.ts | 421 | app/api/google/calendars/events/ |
| 11 | encryption.ts | 401 | lib/server/ |

**分割方針**: 各サービスをCRUD/Sync/Utilsに分割、APIはhandlers/に分割

---

## Worker D: Core + Types専任 (11ファイル / 5,091行)

| # | ファイル | 行数 | パス |
|---|---------|------|------|
| 1 | validator.ts | 610 | lib/core/ |
| 2 | calendar.ts | 598 | lib/types/ |
| 3 | okr.ts | 481 | lib/core/ |
| 4 | customer-journey.ts | 473 | lib/types/ |
| 5 | template-variables.ts | 465 | lib/types/ |
| 6 | required-fields.ts | 460 | lib/types/ |
| 7 | data-quality.ts | 452 | lib/core/ |
| 8 | business-summary.ts | 425 | lib/core/ |
| 9 | status-master.ts | 419 | lib/types/ |
| 10 | template-engine.ts | 417 | lib/core/ |
| 11 | action-recommender.ts | 415 | lib/core/ |
| 12 | tag-master.ts | 400 | lib/types/ |

**分割方針**: Types → base/extended/guards に分割、Core → rules/calculations/utils に分割

---

## 実行手順

### 1. Worktree作成 (並列)

```bash
cd /Users/5dmgmt/プラグイン/foundersdirect
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/worker-a -b phase14.6.4-worker-a
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/worker-b -b phase14.6.4-worker-b
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/worker-c -b phase14.6.4-worker-c
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/worker-d -b phase14.6.4-worker-d
```

### 2. 4並列実行

Task toolで4つのエージェントを同時起動:
- Worker A: ViewModel分割
- Worker B: Component分割
- Worker C: Service/API分割
- Worker D: Core/Types分割

### 3. 統合

```bash
git checkout main
git merge phase14.6.4-worker-a --no-ff -m "merge: Phase 14.6.4 Worker A"
# Worker B, C, D も順次 rebase & merge
```

### 4. クリーンアップ

```bash
git worktree remove worker-a worker-b worker-c worker-d --force
git branch -d phase14.6.4-worker-{a,b,c,d}
```

---

## 成功基準

- [ ] 400行以上のファイル: 50 → 5以下 (テスト除く)
- [ ] type-check: PASS
- [ ] build: PASS
- [ ] 後方互換性維持

---

**作成日**: 2025-12-02
