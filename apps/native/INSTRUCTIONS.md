# Troubleshooting WorkOS Redirect URI Error

The error "This is not a valid redirect URI" means WorkOS rejected the URI `shopnima://callback`.

Please verify the following in your WorkOS Dashboard:

1.  **Exact Match**: Ensure the Redirect URI is exactly `shopnima://callback`.
    - **NO trailing slash**: `shopnima://callback/` is incorrect.
    - **NO spaces**: Check for invisible spaces at the start or end.

2.  **Correct App & Environment**:
    - You are using Client ID: `client_01KC4723R44SCV8DCXT4EVV42Z`
    - Ensure you are editing the **Staging** environment for the **Nima Native** app (if you have multiple).

3.  **Scheme Validity**:
    - Ensure `shopnima` is a valid custom scheme allowed in your WorkOS settings (usually allowed for native apps).

4.  **Save Changes**:
    - Make sure to save/publish the changes in the dashboard.

Once verified, try capturing the full URL being sent (the one in the error screenshot) to confirm exactly what is being sent.
