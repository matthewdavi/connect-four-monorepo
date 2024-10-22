export function GET() {
  const number = Math.random();
  return Response.json({ number });
}

export const config = {
  runtime: "edge",
};
