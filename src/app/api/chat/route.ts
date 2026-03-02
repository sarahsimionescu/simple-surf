export async function POST() {
  return new Response(
    JSON.stringify({
      error: "Sorry, we ran out of credits. Please try again later.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}
