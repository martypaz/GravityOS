import { NextResponse } from 'next/server';

// Generative rule-based backup suggestions if no API key is set
const RULE_BASED_SPECIALTIES: Record<string, { specialties: string; message: string }> = {
  seo: {
    specialties: 'SEO copywriting, keyword mapping, schema markup, and metadata optimization.',
    message: 'Hello! Let’s optimize your site’s search visibility, structure rich snippets, and climb the organic rankings.'
  },
  marketing: {
    specialties: 'conversion rate optimization (CRO), ad copies, customer acquisition channels, and cohort metrics.',
    message: 'Hey there! Ready to scale campaigns, refine landing pages, and boost your conversion metrics.'
  },
  copywriter: {
    specialties: 'High-burstiness landing copy, anti-AI content scoring, and engaging customer onboarding flows.',
    message: 'Greetings! Let’s craft some high-converting, humanlike content that keeps readers hooked.'
  },
  database: {
    specialties: 'Prisma schema optimizations, index structures, scaling postgres/mysql in Docker, and connection pooling.',
    message: 'Database systems targeted and active. Ready to write clean, high-performance migrations.'
  },
  devops: {
    specialties: 'Docker compose bindings, PM2 daemon controls, continuous deployment, and Nginx reverse proxies.',
    message: 'DevOps node operational. Let’s automate your build containers and secure production environments.'
  },
  frontend: {
    specialties: 'React Server Components, Tailwind CSS, bundle size optimization, and state management.',
    message: 'Hey! Ready to design super-fast, responsive layouts that feel premium and follow Maya’s style guide.'
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (!role) {
      return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
    }

    const lowerRole = role.toLowerCase();

    // 1. Try to query Google Gemini if API Key is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `Generate advisor specialties and a greeting message for an AI expert advisor with the following role: "${role}".
Respond STRICTLY with a JSON object in this exact schema:
{
  "specialties": "string describing 3 core specialties separated by commas",
  "message": "a friendly, short initial greeting message as this advisor"
}
Ensure the specialties are professional and direct, and avoid any introductory or concluding text in your response.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText.trim());
          if (parsed.specialties && parsed.message) {
            return NextResponse.json({
              success: true,
              source: 'AI (Gemini)',
              specialties: parsed.specialties,
              message: parsed.message
            });
          }
        }
      } catch (geminiError) {
        // Fall through to rule-based or generic suggestions on failure
      }
    }

    // 2. Semantic fallback matching
    for (const [key, suggestion] of Object.entries(RULE_BASED_SPECIALTIES)) {
      if (lowerRole.includes(key)) {
        return NextResponse.json({
          success: true,
          source: 'Rule Matcher',
          specialties: suggestion.specialties,
          message: suggestion.message
        });
      }
    }

    // Default generic fallback
    return NextResponse.json({
      success: true,
      source: 'Generator Fallback',
      specialties: `Specialized skills in ${role}, trend monitoring, and custom tool mapping.`,
      message: `Hello! I am ready to consult you on ${role} and optimize your workflows in the ${role} domain.`
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
