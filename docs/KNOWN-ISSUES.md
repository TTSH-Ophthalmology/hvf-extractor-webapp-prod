# Known Issues and Improvement Ideas

Notes from a review of the deployment scripts and adjacent auth code, focused on
user-error scenarios (re-running install, slow machines, multiple installs).
Only items that still need a fix are kept here; see `CHANGELOG.md` for what's
already shipped.

## 1. Refresh-token rotation has a small race window (not deployment-related)

**Where:** `backend/app/main.py`, `POST /api/refresh`

The old refresh token gets revoked before the new one is confirmed delivered
to the client:

```python
store.revoke_refresh_token(token_id)

new_access_token = create_access_token(...)
new_refresh_token = create_refresh_token(...)
...
response.set_cookie(key="refresh_token", value=new_refresh_token, ...)
```

A network blip between the revoke and the client actually receiving the new
cookie could leave a legitimate session stuck logged out.

**Suggested fix:** revoke the old token only after the new one is
successfully issued (or accept the current behavior as an acceptable
trade-off for revocation-on-use security, this needs a product decision, not
just a code change).
