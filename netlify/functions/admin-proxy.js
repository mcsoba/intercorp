const OWNER = 'mcsoba';
const REPO = 'intercorp';
const GH = (file) => `https://api.github.com/repos/${OWNER}/${REPO}/contents/${file}`;

function json(status, body) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function ghHeaders() {
    return {
        Authorization: `token ${process.env.GITHUB_PAT}`,
        Accept: 'application/vnd.github.v3+json',
    };
}

export default async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

    let body;
    try { body = await req.json(); } catch { return json(400, { error: 'Érvénytelen kérés.' }); }

    const { password, action, file, sha, message, content, isBase64 } = body;

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
        return json(401, { error: 'Hibás jelszó.' });
    }
    if (!file) return json(400, { error: 'Hiányzó file paraméter.' });

    if (action === 'get') {
        const resp = await fetch(GH(file), { headers: ghHeaders() });
        if (!resp.ok) return json(resp.status, { error: `GitHub API hiba: ${resp.status}` });
        const data = await resp.json();
        return json(200, { sha: data.sha, content: data.content });
    }

    if (action === 'put') {
        const encoded = isBase64 ? content : Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
        const putBody = { message: message || 'Admin: frissítés', content: encoded };
        if (sha) putBody.sha = sha;
        const resp = await fetch(GH(file), {
            method: 'PUT',
            headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(putBody),
        });
        if (!resp.ok) return json(resp.status, { error: `GitHub API hiba: ${resp.status}` });
        const data = await resp.json();
        return json(200, { sha: data.content.sha });
    }

    return json(400, { error: 'Ismeretlen action.' });
};
