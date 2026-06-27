import { useState } from 'react';
import { Download, Copy, Check, FileText, Image, Video, Sparkles, AlertCircle } from 'lucide-react';

interface MarketingResourcesProps {
  referralCode: string;
}

export default function MarketingResources({ referralCode }: MarketingResourcesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const referralLink = `${window.location.origin}/ref?code=${referralCode}`;
  
  // Direct Google Drive image url (dynamic from localStorage with elegant fallback)
  const logoUrl = localStorage.getItem('webnixo_marketing_logoUrl') || "https://lh3.googleusercontent.com/d/11yuTE40NZx1imt0DARVHUfIPTrgtrJA6=s512";

  // Load customized banners copy if set by admin
  let leaderboardTitle = 'Leaderboard Banner (728 x 90)';
  let leaderboardDesc = 'Ideal for header or footer spaces on blogs and content websites.';
  let squareTitle = 'Medium Rectangle (300 x 250)';
  let squareDesc = 'Perfect for sidebar placements, widget zones, or in-article content.';
  let socialTitle = 'Social Post / Square (1080 x 1080)';
  let socialDesc = 'High-resolution square format tailored for LinkedIn, Twitter, or Instagram.';

  const storedBanners = localStorage.getItem('webnixo_marketing_banners');
  if (storedBanners) {
    try {
      const parsed = JSON.parse(storedBanners);
      const lBanner = parsed.find((b: any) => b.id === 'banner-leaderboard');
      if (lBanner) {
        leaderboardTitle = lBanner.title || leaderboardTitle;
        leaderboardDesc = lBanner.description || leaderboardDesc;
      }
      const sBanner = parsed.find((b: any) => b.id === 'banner-square');
      if (sBanner) {
        squareTitle = sBanner.title || squareTitle;
        squareDesc = sBanner.description || squareDesc;
      }
      const socBanner = parsed.find((b: any) => b.id === 'banner-social');
      if (socBanner) {
        socialTitle = socBanner.title || socialTitle;
        socialDesc = socBanner.description || socialDesc;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const banners = [
    {
      id: 'banner-leaderboard',
      title: leaderboardTitle,
      dimensions: '728x90',
      description: leaderboardDesc,
      previewClass: 'w-full h-[90px] max-w-[728px]',
      embedCode: `<a href="${referralLink}" target="_blank">\n  <img src="${logoUrl}" alt="WEBNIXO AI" width="728" height="90" border="0" />\n</a>`
    },
    {
      id: 'banner-square',
      title: squareTitle,
      dimensions: '300x250',
      description: squareDesc,
      previewClass: 'w-[300px] h-[250px]',
      embedCode: `<a href="${referralLink}" target="_blank">\n  <img src="${logoUrl}" alt="WEBNIXO AI" width="300" height="250" border="0" />\n</a>`
    },
    {
      id: 'banner-social',
      title: socialTitle,
      dimensions: '1080x1080',
      description: socialDesc,
      previewClass: 'w-[250px] h-[250px] sm:w-[320px] sm:h-[320px]',
      embedCode: `<a href="${referralLink}" target="_blank">\n  <img src="${logoUrl}" alt="WEBNIXO AI" width="1080" height="1080" border="0" />\n</a>`
    }
  ];

  // Dynamic Video Embed Code
  const rawVideoCode = localStorage.getItem('webnixo_marketing_videoCode') || `<iframe width="560" height="315" src="https://www.youtube.com/embed/placeholder" title="WEBNIXO AI Overview" frameborder="0" allowfullscreen></iframe>`;
  const dynamicVideoEmbed = rawVideoCode.includes('${referralCode}') 
    ? rawVideoCode.replace(/\$\{referralCode\}/g, referralCode) 
    : rawVideoCode.includes('?ref=') 
      ? rawVideoCode 
      : rawVideoCode.replace('placeholder', `placeholder?ref=${referralCode}`);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8" id="marketing-resources-tab">
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-slate-900">Marketing Collateral & Assets</h3>
        <p className="text-xs text-slate-500">
          Save time and convert more traffic! Use these certified creative assets to recommend WEBNIXO AI to your audience.
        </p>
      </div>

      {/* Corporate Logo Asset Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Image className="h-4 w-4 text-indigo-500" />
              Official WEBNIXO AI Logo
            </h4>
            <p className="text-xs text-slate-500">
              Your company logo is hosted on Google Drive. Use this high-res emblem for custom reviews and write-ups.
            </p>
          </div>
          <div className="flex gap-2">
            <a 
              href="https://drive.google.com/file/d/11yuTE40NZx1imt0DARVHUfIPTrgtrJA6/view?usp=drivesdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              View on Drive
            </a>
            <button
              onClick={() => handleCopy('logo-url', logoUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {copiedId === 'logo-url' ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Direct Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Logo Preview box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Light Background Preview */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col items-center justify-center relative group min-h-[160px]">
            <span className="absolute top-2 left-2 text-[10px] uppercase font-bold text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
              Light Canvas Mockup
            </span>
            <div className="flex flex-col items-center gap-3">
              <img 
                src={logoUrl} 
                alt="WEBNIXO AI Logo" 
                className="max-h-16 w-auto object-contain hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Elegant Fallback in case Google Drive rejects hotlinking
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const sibling = target.nextElementSibling as HTMLElement;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
              {/* Fallback elegant CSS logo */}
              <div className="hidden h-14 items-center justify-center font-black text-slate-900 text-xl tracking-tighter uppercase select-none">
                <span className="text-indigo-600 font-extrabold mr-1">W</span>EBNIXO <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1 text-xs">AI</span>
              </div>
            </div>
          </div>

          {/* Dark Background Preview */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 flex flex-col items-center justify-center relative group min-h-[160px]">
            <span className="absolute top-2 left-2 text-[10px] uppercase font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
              Dark Canvas Mockup
            </span>
            <div className="flex flex-col items-center gap-3">
              <img 
                src={logoUrl} 
                alt="WEBNIXO AI Logo" 
                className="max-h-16 w-auto object-contain hover:scale-105 transition-transform invert"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const sibling = target.nextElementSibling as HTMLElement;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-14 items-center justify-center font-black text-white text-xl tracking-tighter uppercase select-none">
                <span className="text-indigo-400 font-extrabold mr-1">W</span>EBNIXO <span className="bg-indigo-500 text-white px-1.5 py-0.5 rounded ml-1 text-xs">AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Advertisements */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-indigo-500" />
          Promotional Web Banners
        </h4>

        <div className="grid grid-cols-1 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-bold text-slate-800 text-sm">{banner.title}</h5>
                  <p className="text-xs text-slate-500 mt-0.5">{banner.description}</p>
                </div>
                <button
                  onClick={() => handleCopy(banner.id, banner.embedCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-xl text-xs font-semibold transition-all cursor-pointer self-start"
                >
                  {copiedId === banner.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Embed Code Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Embed Code
                    </>
                  )}
                </button>
              </div>

              {/* Live Preview Container */}
              <div className="bg-slate-100 border border-slate-200/60 rounded-xl p-4 flex items-center justify-center overflow-x-auto">
                {banner.id === 'banner-leaderboard' ? (
                  <div className={`bg-gradient-to-r from-indigo-900 via-slate-950 to-indigo-950 border border-indigo-800 text-white rounded-lg px-6 flex items-center justify-between gap-4 ${banner.previewClass}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-xs bg-indigo-600/30 text-indigo-300 font-extrabold px-1.5 py-0.5 rounded border border-indigo-500/20">W</div>
                      <div className="leading-tight">
                        <p className="text-xs font-extrabold tracking-tight">WEBNIXO AI</p>
                        <p className="text-[9px] text-indigo-300">Assemble modern sites with natural language</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">2026 Next-Gen Builder</span>
                      <span className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] px-3 py-1.5 rounded-md uppercase tracking-wider shadow-md">
                        Try Free
                      </span>
                    </div>
                  </div>
                ) : banner.id === 'banner-square' ? (
                  <div className={`bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900 text-white rounded-xl p-5 flex flex-col justify-between ${banner.previewClass}`}>
                    <div className="flex items-center justify-between border-b border-indigo-950/50 pb-2">
                      <span className="text-[10px] font-bold text-indigo-400">WEBNIXO AI</span>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="my-2 text-center">
                      <p className="text-sm font-black tracking-tight leading-snug">
                        Struggling with Code? Build Websites in Seconds.
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Our AI drafts complete premium sites, sets up full assets, and deploys immediately.
                      </p>
                    </div>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] py-2 rounded-lg uppercase tracking-wider shadow-sm mt-1">
                      Start Assembly Now
                    </button>
                  </div>
                ) : (
                  <div className={`bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 border border-indigo-900 text-white rounded-xl p-4 flex flex-col justify-between items-center text-center ${banner.previewClass}`}>
                    <div className="text-center space-y-1">
                      <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase block">WEBNIXO AI</span>
                      <h4 className="text-xs font-black tracking-tight uppercase">Construct Websites with Plain Text</h4>
                    </div>
                    <div className="h-10 w-10 bg-indigo-600/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="space-y-2 w-full">
                      <p className="text-[9px] text-slate-400">No layout experience required.</p>
                      <button className="w-full bg-white text-slate-950 font-black text-[9px] py-2 rounded-lg uppercase tracking-wider">
                        Explore WEBNIXO
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Code viewer */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Copy HTML Integration Code</span>
                <pre className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre">
                  {banner.embedCode}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Guides asset card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Video className="h-4 w-4 text-indigo-500" />
            Video Resource embeds
          </h4>
          <p className="text-xs text-slate-500">
            Share our high-converting video demonstration with your audience. This embeds our official explainer video pre-loaded with your affiliate cookie tag.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-44 h-24 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0 relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
              <span className="h-8 w-8 bg-white text-slate-900 rounded-full flex items-center justify-center font-bold text-xs shadow-md">
                ▶
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-12">Explainer Video</span>
          </div>

          <div className="flex-1 space-y-2 w-full">
            <h5 className="font-bold text-slate-800 text-xs">WEBNIXO AI 60-Second Overview</h5>
            <p className="text-xs text-slate-500">
              An energetic, professionally voiced 60-second video going over the main generator mechanics. Highly effective on review posts and sidebars.
            </p>
            <button
              onClick={() => handleCopy('video-embed', dynamicVideoEmbed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {copiedId === 'video-embed' ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Embed Code Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Video Embed Iframe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
