# TDEA 統一會員身分 API（第一階段）

狀態：已完成程式與本機驗證，尚未部署、尚未切換 TDEA-DESIGN。

## 邊界

- 唯一資料來源仍是 `R2 -> manager/state.json`。
- 同時讀取 `general`、`association`、`vendor` 三類會員。
- 本階段只有唯讀解析，不新增、修改或清理任何會員資料。
- 不影響既有兩條 TDEA-DESIGN lookup API、活動、點數與管理功能。
- TDEA-DESIGN 必須等第二階段才可開始呼叫本 API。

## 內部 API

```http
POST /api/internal/v1/member-identity/resolve
Host: tdea-member.internal
Content-Type: application/json
```

```json
{
  "lineUserId": "U0123456789abcdef0123456789abcdef"
}
```

這個 hostname 僅供 Cloudflare Service Binding 使用；一般公開 hostname 會回 `404`。
第二階段應由 TDEA-DESIGN 後端先驗證 LINE 登入憑證，再把已驗證的 LINE UID 送到本 API，前端不得直接指定 UID。

## 成功回應

```json
{
  "success": true,
  "identity": {
    "memberId": "TDEA 的穩定會員識別值",
    "lineUserId": "LINE UID",
    "displayName": "顯示名稱",
    "active": true,
    "memberships": [
      {
        "type": "general",
        "memberNo": "會員編號",
        "displayName": "顯示名稱",
        "active": true,
        "loginAllowed": true,
        "updatedAt": "ISO 時間"
      }
    ],
    "source": "manager/state.json",
    "identityVersion": 1
  }
}
```

## 失敗規則

- `400 INVALID_LINE_USER_ID`：UID 格式錯誤。
- `404 MEMBER_NOT_FOUND`：三類名冊都找不到 UID。
- `409 MEMBER_IDENTITY_CONFLICT`：同一 UID 對到多個無法確認為同一人的會員紀錄。

多筆紀錄不會因為共用同一個 LINE UID 就自動合併。只有 TDEA 已存在相同的明確跨系統人員識別值時，才會合併成一個身分並回傳多個 `memberships`。

## 第二階段接法

1. TDEA-DESIGN 後端驗證 LINE ID token，取得可信任的 UID。
2. 經 `TDEA_WORKER` Service Binding 呼叫 `https://tdea-member.internal/api/internal/v1/member-identity/resolve`。
3. 報名與會員綁定只引用回傳的 `memberId`，不再自行建立另一份會員真相。
4. `409` 必須停下並交由管理員處理，不可挑第一筆繼續報名。
