export async function POST() {
  return Response.json(
    { error: "Sorry, we ran out of credits. Please try again later." },
    { status: 503 },
  );
}
