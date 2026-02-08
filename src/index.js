export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Set CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    // Route handling
    if (url.pathname === '/' || url.pathname === '') {
      const html = await fetch(`https://raw.githubusercontent.com/yourusername/arsystream/main/public/index.html`);
      return new Response(await html.text(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    if (url.pathname === '/style.css') {
      const css = await fetch(`https://raw.githubusercontent.com/yourusername/arsystream/main/public/style.css`);
      return new Response(await css.text(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    if (url.pathname === '/player.js') {
      const js = await fetch(`https://raw.githubusercontent.com/yourusername/arsystream/main/public/player.js`);
      return new Response(await js.text(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // API endpoint for proxying requests (if needed)
    if (url.pathname === '/api/proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'No URL provided' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': response.headers.get('Content-Type'),
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch URL' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    
    // 404 for other routes
    return new Response('Not Found', { 
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  },
};
