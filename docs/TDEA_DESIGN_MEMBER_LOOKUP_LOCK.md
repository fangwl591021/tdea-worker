# TDEA-DESIGN 會員查詢鎖定契約

版本：2026-08-18
狀態：LOCKED / 已驗證正式基線
適用專案：`fangwl591021/tdea-worker`
對接端：`TDEA-DESIGN`

## 1. 鎖定目的

本文件鎖定 TDEA-DESIGN 與 tdea-worker 之間的會員姓名查詢與會員資料核對流程。

2026-08-18 已完成實機驗證：

- TDEA-DESIGN 送出 `memberType=association`、`fullName=Tonyfang`
- tdea-worker 可成功由正式名冊資料取得對應會員編號
- 問題根因已確認為正式 Worker 入口原本缺少 TDEA-DESIGN 正在呼叫的內部 lookup API
- 修正後已成功查到資料

此流程自本版本起視為已驗證基線。除非有明確需求與完整回歸驗證，後續修改不得自行替換架構、資料來源、入口或 API contract。

## 2. 正式 Worker 入口

正式入口維持：

```text
src/roster-single-crud-entry.ts
```

### 禁止事項

- 不得為會員查詢另外新增 wrapper 入口取代此檔。
- 不得為了會員查詢修改 `wrangler.toml` 的正式入口。
- 不得把 lookup 功能移到另一個臨時 Worker。
- 不得因權限、活動、點數等其他功能而重構這個已驗證入口。

若需新增功能，優先在既有入口內做最小修改並保持其他 request 透傳既有 app。

## 3. 唯一正式資料來源

會員查詢唯一正式資料來源：

```text
R2 -> manager/state.json
```

常數：

```text
MANAGER_KEY = "manager/state.json"
```

會員類型：

```text
association
vendor
```

### 禁止事項

- 不得自行改回舊會員資料來源。
- 不得建立第二份會員名冊作為 lookup authority。
- 不得使用前端暫存、硬編碼資料或其他資料庫取代 `manager/state.json`。
- 不得要求 TDEA-DESIGN 自己保存一份重複會員名冊。

如未來需要資料遷移，必須先明確制定 migration，並在切換前保持本 contract 可用。

## 4. API A：姓名查會員編號

```http
POST /api/internal/tdea-design/member-number-lookup
```

此 API 用於 TDEA-DESIGN 先以姓名／公司名稱取得會員編號。

### association 請求範例

```json
{
  "memberType": "association",
  "fullName": "Tonyfang"
}
```

### vendor 請求範例

```json
{
  "memberType": "vendor",
  "fullName": "公司名稱"
}
```

### 成功回傳契約

```json
{
  "success": true,
  "match": {
    "memberNumber": "會員編號",
    "rosterName": "正式名冊姓名或公司名稱",
    "source": "manager/state.json",
    "phone": "名冊電話，如有"
  }
}
```

`memberNumber` 必須來自正式名冊欄位，不得由前端生成或推算。

### 搜尋規則

1. 依 `memberType` 限定 association 或 vendor 名冊。
2. 先做標準化後的完整名稱精確比對。
3. 精確比對沒有結果時，才允許名稱包含搜尋。
4. 無結果回 404 與可理解訊息。
5. 多筆相符回 409，要求更完整姓名／公司名稱，不得隨機取第一筆。

## 5. API B：會員編號＋身分資料核對

```http
POST /api/internal/tdea-design/member-lookup
```

此 API 用於已取得會員編號後進行後續會員核對。

### 基本請求範例

```json
{
  "memberType": "association",
  "memberNumber": "會員編號",
  "fullName": "Tonyfang"
}
```

可另外帶入：

```text
phone
birthday
```

### 核對規則

- `memberNumber` 為主要查找鍵。
- 有傳 `fullName` 時，必須與正式名冊名稱相符。
- 電話只有在「請求有電話且名冊也有電話」時才比對。
- 生日只有在「請求有生日且名冊也有生日」時才比對。
- 不得因舊名冊缺少電話或生日，就把原本有效會員判定為不存在。

## 6. 名稱欄位相容性

association 名稱允許依序讀取：

```text
name
rosterName
memberName
displayName
```

vendor 名稱允許依序讀取：

```text
companyName
company
name
rosterName
displayName
```

會員編號相容欄位：

```text
memberNo
rosterMemberNo
member_no
```

不要任意刪除這些相容欄位，除非已先完成名冊資料 migration 與全量驗證。

## 7. 內部服務限制

這兩個 lookup API 是 TDEA-DESIGN 對 tdea-worker 的內部服務契約。

實作需維持內部 request host 驗證，不應直接把同一條 lookup API 無限制公開成一般匿名對外搜尋會員資料的入口。

若未來調整 Service Binding / internal hostname，必須同步修改雙方並完成整合測試；不得只改單邊。

## 8. 已驗證成功案例

### 輸入

```json
{
  "memberType": "association",
  "fullName": "Tonyfang"
}
```

### 驗收結果

```text
PASS：可成功找到 Tonyfang 對應會員資料／會員編號。
```

此案例為最基本 regression case。

後續任何修改會員 lookup、R2 名冊讀取、Worker 入口、Service Binding、名稱欄位 normalization 時，都必須再次驗證此案例。

## 9. 回歸驗收清單

修改相關程式前後至少確認：

- [ ] `src/roster-single-crud-entry.ts` 仍是正式入口。
- [ ] `manager/state.json` 仍為 lookup authority。
- [ ] `POST /api/internal/tdea-design/member-number-lookup` 存在。
- [ ] `POST /api/internal/tdea-design/member-lookup` 存在。
- [ ] association 可用姓名查會員編號。
- [ ] vendor 可用公司名稱查會員編號。
- [ ] `Tonyfang` regression case 通過。
- [ ] 同名多筆不會隨機選人。
- [ ] 查無資料不回模糊的底層 `Not found`，而回 lookup 本身的明確錯誤。
- [ ] 會員 CRUD 不受影響。
- [ ] 活動功能不受影響。
- [ ] 點數功能不受影響。
- [ ] 權限功能不受影響。
- [ ] 未修改 Wrangler 正式入口，除非有獨立、明確且核准的架構變更。

## 10. AI / Codex 修改規則

任何 AI、Codex 或開發者讀到本文件時，應把以下內容視為強制約束：

> 這是一個已在正式環境驗證成功的會員查詢契約，不是待重新設計的參考方案。

因此：

1. 先讀本文件，再修改會員查詢相關程式。
2. 優先做最小差異修改。
3. 不得自行重新設計資料來源。
4. 不得自行建立 wrapper 取代正式入口。
5. 不得自行把 lookup 與會員 CRUD 拆到另一個 Worker。
6. 不得因「架構更漂亮」而破壞既有 TDEA-DESIGN contract。
7. 若需求與本契約衝突，應先指出衝突並等待明確核准，而不是直接改掉基線。

## 11. 查詢功能變更必須先取得使用者明確核准

此條為最高優先級操作規則。

凡是任何會影響「查詢」行為或查詢結果的修改，不論修改範圍大小，AI、Codex、開發者或自動化流程都**不得自行執行**，必須先向使用者說明影響並取得明確同意。

必須先取得核准的範圍包含但不限於：

- 查詢 API 路徑、method、payload、response schema
- `member-number-lookup`、`member-lookup` 的任何程式邏輯
- 查詢資料來源或 authority
- `manager/state.json` 的讀取方式
- 姓名／公司名稱比對規則
- 精確比對、模糊比對、包含搜尋、排序、同名處理
- 會員編號、電話、生日等欄位的核對規則
- normalization、欄位 fallback、欄位別名
- 查詢結果顯示、隱藏、過濾、去重、排序
- 查詢權限、內部 host、Service Binding、身份判斷
- 查詢錯誤訊息與 status code，若可能影響前端流程
- 任何 wrapper、快取、代理層或 fallback，只要會經過或改變查詢
- 為其他功能（活動、點數、權限、會員管理等）而連帶修改查詢流程

### 必須遵守的流程

1. 先檢測與說明問題。
2. 明確指出「預計要動到查詢的哪一段」。
3. 停止實作。
4. 等待使用者明確回覆同意，例如「同意」、「可以改」、「開始」。
5. 取得核准後才可建立修改查詢程式的 branch / commit / PR。

未取得明確核准時，只允許：

- 唯讀檢查
- 程式碼搜尋
- 日誌分析
- 問題定位
- 提出修正方案
- 撰寫不影響 runtime 的分析文件

**禁止把「使用者要求修其他功能」推定為已同意修改查詢。**

如果修其他功能時發現必須動到查詢，必須停下來重新取得一次明確核准。

## 12. 基線來源

本鎖定契約對應修正：

```text
PR #34 - fix: restore TDEA design member lookup APIs
merge commit: b4721ccfffbc2519c9efce8cace4917cb5453bf6
```

狀態：2026-08-18 已由使用端確認「查到了」。

---

**LOCKED BASELINE**

除非需求明確要求變更此契約，後續維護必須保持上述行為相容。
