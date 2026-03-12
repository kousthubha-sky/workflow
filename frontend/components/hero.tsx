"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

const ASCII_ART = `
╔════════════════════════════════════════════════════════════════════════════╗
                                                                            
    ██████╗ ███████╗██████╗ ███████╗██╗███████╗████████╗███████╗███╗   ██╗ ████████╗
    ██╔══██╗██╔════╝██╔══██╗██╔════╝██║██╔════╝╚══██╔══╝██╔════╝████╗  ██║ ╚══██╔══╝
    ██████╔╝█████╗  ██████╔╝███████╗██║███████╗   ██║   █████╗  ██╔██╗ ██║    ██║  
    ██╔═══╝ ██╔══╝  ██╔══██╗╚════██║██║╚════██║   ██║   ██╔══╝  ██║╚██╗██║    ██║ 
    ██║     ███████╗██║  ██║███████║██║███████║   ██║   ███████╗██║ ╚████║    ██║ 
    ╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝    ╚═╝
                                                                            
╚════════════════════════════════════════════════════════════════════════════╝`.trim();

/* Real brand SVGs from Simple Icons */
const agentIcons = [
  { name: "Claude Code", path: "M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" },
  { name: "Cursor", path: "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" },
  { name: "GitHub Copilot", path: "M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" },
  { name: "Windsurf", path: "M1 0a1 1 0 0 0-1 1v22c0 .063.007.124.018.184L0 23.199l.025.026c.103.443.5.775.975.775h22a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1H1zm.707 1h20.582l-2 2H3.707l-2-2zM23 1.705v20.588l-2-2V3.705l2-2zM1 1.707l2 2v16.492l-2 2V1.707zM4 4h16v16H4V4zm3.537 3c-1.006 0-1.51.535-1.51 1.605v2.297c0 .4-.184.6-.554.6a.47.47 0 0 0-.344.139.512.512 0 0 0-.129.365.49.49 0 0 0 .129.353.47.47 0 0 0 .344.139c.37 0 .554.2.554.6v2.297c0 1.07.504 1.605 1.51 1.605.136 0 .248-.05.334-.148A.494.494 0 0 0 8 16.498a.512.512 0 0 0-.129-.365.439.439 0 0 0-.334-.139c-.376 0-.564-.199-.564-.6v-2.296c0-.46-.1-.823-.297-1.092.099-.138.173-.3.222-.485.05-.183.075-.389.075-.619V8.605c0-.4.188-.6.564-.6a.439.439 0 0 0 .334-.138A.499.499 0 0 0 8 7.512a.53.53 0 0 0-.129-.364A.425.425 0 0 0 7.537 7zm8.926 0a.425.425 0 0 0-.334.148.53.53 0 0 0-.129.364.5.5 0 0 0 .129.355.439.439 0 0 0 .334.139c.376 0 .564.199.564.6v2.296c0 .23.025.436.075.62.049.183.123.346.222.484-.197.27-.297.632-.297 1.092v2.297c0 .4-.188.6-.564.6a.439.439 0 0 0-.334.138.512.512 0 0 0-.129.365c0 .145.043.262.129.354a.425.425 0 0 0 .334.148c1.006 0 1.51-.535 1.51-1.605v-2.297c0-.4.184-.6.554-.6a.439.439 0 0 0 .334-.139.475.475 0 0 0 .139-.353.492.492 0 0 0-.139-.365.439.439 0 0 0-.334-.139c-.37 0-.554-.2-.554-.6V8.605c0-1.07-.504-1.605-1.51-1.605zm-7.25 6a.737.737 0 0 0-.496.227.717.717 0 0 0-.217.529.74.74 0 0 0 .75.744.74.74 0 0 0 .75-.744.717.717 0 0 0-.217-.53A.71.71 0 0 0 9.25 13h-.037zm2.75 0a.737.737 0 0 0-.496.227.717.717 0 0 0-.217.529.74.74 0 0 0 .217.53c.152.143.33.214.533.214a.74.74 0 0 0 .75-.744.717.717 0 0 0-.217-.53.71.71 0 0 0-.533-.226h-.037zm2.75 0a.737.737 0 0 0-.496.227.717.717 0 0 0-.217.529.74.74 0 0 0 .217.53c.152.143.33.214.533.214a.74.74 0 0 0 .75-.744.717.717 0 0 0-.217-.53.71.71 0 0 0-.533-.226h-.037zm-11.1 8h16.68l2 2H1.613l2-2z" },
  { name: "OpenCode", path: "M2.214 4.954v13.615L7.655 24V10.314L3.312 3.845 2.214 4.954zm4.999 17.98l-4.557-4.548V5.136l.59-.596 3.967 5.908v12.485zm14.573-4.457l-.862.937-4.24-6.376V0l5.068 5.092.034 13.385zM7.431.001l12.998 19.835-3.637 3.637L3.787 3.683 7.43 0z", imageUrl: "https://opencode.ai/favicon.ico" },
  { name: "Continue.dev", path: "M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z", imageUrl: "https://www.continue.dev/favicon.png" },
  { name: "Aider", path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
];

const marqueeItems = [...agentIcons, ...agentIcons];

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText("npx @kousthubha/persistent init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-24 pb-16">
      {/* Blue glow behind the hero box — openspec.dev style */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[800px] h-[600px] rounded-full bg-accent/[0.05] blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative">
        {/* The bordered container — stacked rows like openspec.dev */}
        <div className="border border-border-2">

          {/* ROW 1 — ASCII Art headline (like openspec's centered headline, but with ASCII art) */}
          <div className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center overflow-x-auto">
            <pre className="text-white text-[7px] sm:text-[9px] md:text-xs leading-tight font-mono whitespace-pre select-none mb-3 sm:mb-4">
              {ASCII_ART}
            </pre>
            <p className="text-muted-2 font-mono text-xs sm:text-sm md:text-base mt-2 max-w-xl px-2">
              Bootstrap your AI coding agent with persistent context.
              One command. Any stack. Any agent.
            </p>
          </div>

          {/* ROW 2 — Values grid (exact openspec.dev pattern: 4 equal cells) */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border-2">
            {["UNIVERSAL", "OPEN SOURCE", "ANY AGENT", "NO MCP REQUIRED"].map((v, i) => (
              <div
                key={v}
                className={`py-3 sm:py-4 text-center font-mono text-[9px] sm:text-[10px] md:text-xs tracking-[0.15em] text-muted-2 ${
                  i > 0 ? "border-l border-border-2" : ""
                } ${i >= 2 ? "border-t md:border-t-0 border-border-2" : ""}`}
              >
                {v}
              </div>
            ))}
          </div>

          {/* ROW 3 — Get Started (left label + right command) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-border-2 px-4 sm:px-6 py-4 gap-2 sm:gap-0">
            <span className="font-mono text-[9px] sm:text-[10px] md:text-xs tracking-[0.2em] text-muted uppercase">GET STARTED</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer w-full sm:w-auto"
            >
              <code className="font-mono text-[10px] sm:text-xs md:text-sm text-text break-all sm:break-normal">
                npx @kousthubha/persistent init
              </code>
              {copied ? (
                <Check size={14} className="text-lime shrink-0" />
              ) : (
                <Copy size={14} className="text-muted group-hover:text-muted-2 transition-colors shrink-0" />
              )}
            </button>
          </div>

          {/* ROW 4 — GitHub (left label + right link) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-border-2 px-4 sm:px-6 py-4 gap-2 sm:gap-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] sm:text-[10px] md:text-xs tracking-[0.2em] text-muted uppercase">GITHUB</span>
            </div>
            <a
              href="https://github.com/kousthubha-sky/workflow"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] sm:text-xs text-muted-2 hover:text-text transition-colors flex items-center gap-1 break-all sm:break-normal"
            >
              github.com/kousthubha-sky/workflow
              <span className="text-muted">↗</span>
            </a>
          </div>

          {/* ROW 5 — Discord (left label + right link) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-border-2 px-4 sm:px-6 py-4 gap-2 sm:gap-0">
            <span className="font-mono text-[9px] sm:text-[10px] md:text-xs tracking-[0.2em] text-muted uppercase">DISCORD</span>
            <a
              href="https://discord.gg/YctCnvvshC"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] sm:text-xs text-muted-2 hover:text-text transition-colors flex items-center gap-1"
            >
              discord.gg/YctCnvvshC
              <span className="text-muted">↗</span>
            </a>
          </div>

          {/* ROW 6 — Agent icons marquee (persistent unique addition) */}
          <div className="border-t border-border-2">
            <div className="flex items-center justify-between px-6 py-2 border-b border-border-2 bg-bg-2">
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">SUPPORTED AGENTS</span>
              <span className="font-mono text-[10px] text-muted">7 AGENTS</span>
            </div>
            <div className="marquee-container overflow-hidden py-5 bg-bg">
              <div className="marquee-track flex gap-12 items-center">
                {marqueeItems.map((agent, i) => (
                  <div
                    key={`${agent.name}-${i}`}
                    className="flex flex-col items-center gap-2 shrink-0 text-muted hover:text-text transition-colors group cursor-default"
                    title={agent.name}
                  >
                    {agent.imageUrl ? (
                      <img
                        src={agent.imageUrl}
                        alt={agent.name}
                        width={22}
                        height={22}
                        className="group-hover:text-accent transition-colors"
                      />
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="group-hover:text-accent transition-colors"
                      >
                        <path d={agent.path} />
                      </svg>
                    )}
                    <span className="text-[9px] font-mono tracking-wider uppercase whitespace-nowrap opacity-50 group-hover:opacity-100 transition-opacity">
                      {agent.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 7 — Powered by */}
          <div className="flex items-center justify-between border-t border-border-2 px-6 py-3 bg-bg-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">POWERED BY</span>
            <div className="flex items-center gap-4 font-mono text-xs">
              <a href="https://openspec.dev" className="text-accent hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">OpenSpec</a>
              <span className="text-border-2">×</span>
              <a href="https://skills.sh" className="text-amber hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">Skills.sh</a>
              <span className="text-border-2">×</span>
              <a href="https://obsidian.md" className="text-purple hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">Obsidian</a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
