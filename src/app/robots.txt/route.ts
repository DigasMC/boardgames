const SITE = "https://tablist.app";

const BODY = `# Tablist robots.txt
User-agent: *
Allow: /
Allow: /privacy
Allow: /terms
Disallow: /collection
Disallow: /games
Disallow: /sessions
Disallow: /friends
Disallow: /profile
Disallow: /u
Disallow: /api
Disallow: /login
Disallow: /auth
Disallow: /~offline

Sitemap: ${SITE}/sitemap.xml
Agentmap: ${SITE}/.well-known/ai-catalog.json
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
