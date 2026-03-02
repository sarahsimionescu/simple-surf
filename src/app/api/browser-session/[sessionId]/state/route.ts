export async function GET() {
  return Response.json(
    { error: "Sorry, we ran out of credits. Please try again later." },
    { status: 503 },
  );
}
