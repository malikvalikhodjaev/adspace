export function GET() {
  return Response.json({
    app: 'adspace-uz',
    version: '0.2.28',
    mode: 'server-pilot',
  });
}
