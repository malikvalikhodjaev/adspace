export function GET() {
  return Response.json({
    app: 'adspace-uz',
    version: '0.2.33',
    mode: 'server-pilot',
  });
}
