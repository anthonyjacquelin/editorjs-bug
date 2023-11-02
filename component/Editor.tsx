"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import EditorJS, { OutputData, ToolConstructable } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import LinkTool from "@editorjs/link";
import editorjsCodeflask from "@calumk/editorjs-codeflask";
import AlignmentTuneTool from "editorjs-text-alignment-blocktune";
import Checklist from "@editorjs/checklist";
import List from "@editorjs/list";
import OpenseaTool from "@editorjs/opensea";
import Table from "@editorjs/table";
import DragDrop from "editorjs-drag-drop";
import Tooltip from "editorjs-tooltip";
import Embed from "@editorjs/embed";
import Undo from "editorjs-undo";
import TextVariantTune from "@editorjs/text-variant-tune";
import { useMutation } from "react-query";
import { Sparkle } from "lucide-react";
import Paragraph from '@editorjs/paragraph';

const EDITTOR_HOLDER_ID = "editorjs";

const LandingEditor = ({ _id }) => {
  const ref = useRef<EditorJS>(null);
  const scrollRef = useRef(null);

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [infos, setInfos] = useState({
    urls: [],
    state: "" as "link" | "learning" | "generating" | "done" | "",
  });
  const [subject, setSubject] = useState("");
  const [articleToRender, setArticleToRender] = useState("");
  const [content, setContent] = useState<OutputData>();

  useEffect(() => {
    if (!ref.current) {
      console.log("rendering");
      ref.current?.blocks.renderFromHTML(`<h3>Top 5 Nightclubs in Paris</h3>

      <p>Paris is known for its vibrant nightlife, with a wide range of clubs and bars to suit every taste. Whether you're into electronic music, live bands, or trendy cocktail bars, the City of Light has something for everyone. Here are the top 5 nightclubs in Paris that you don't want to miss:</p>
      
      <h4>1. Les Bains-Douches</h4>
      <p>Oozing a luxurious atmosphere, Les Bains-Douches reigns supreme as one of the best Paris clubs. This cozy club sits in the basement of a luxury hotel of the same name and prioritizes elegance and classiness, so much so that it enforces it as its dress code. Put on the classy little black dress you were saving for later, provide a valid ID, pay a small entrance fee, and get a free drink in return! After that, it’s time to let your hair down. Opening its doors`);
    }
  }, [ref]);

  const initializeEditor = useCallback(async () => {
    if (!ref.current) {
      const editor = new EditorJS({
        holder: EDITTOR_HOLDER_ID,
        data: content,
        readOnly: false,
        placeholder: "Start writing here...",
        defaultBlock: "paragraph",
        onReady: () => {
          ref.current = editor;
          new Undo({ editor: ref });
          new DragDrop(ref);
        },
        onChange: async () => {
          let updatedContent = await ref.current?.save();
          setContent(updatedContent);
        },
        tools: {
          paragraph: {
            class: Paragraph,
            inlineToolbar: true,
            // tunes: ["anyTuneName"],
          },
          anyTuneName: {
            class: AlignmentTuneTool,
          },

          
          textVariant: TextVariantTune,
          embed: {
            class: Embed,
            config: {
              services: {
                instagram: true,
                twitter: true,
                "twitch-video": true,
                codepen: true,
                pinterest: true,
                youtube: true,
                spotify: {
                  regex:
                    /https?:\/\/open\.spotify\.com\/(track|playlist|album|user)\/([^\/\?\&]*)(\?si=.*)?/,
                  embedUrl: "https://open.spotify.com/embed/<%= remote_id %>",
                  html: "<iframe frameborder='0' allowtransparency='true' allowfullscreen='' allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' loading='lazy' style='border-radius: 12px; width: 100%; height: 352px;'></iframe>",
                  height: 352,
                  width: 100,
                  id: (groups) => groups.join("/"),
                },
              },
            },
          },
          table: {
            class: Table,
            inlineToolbar: true,
            config: {
              rows: 2,
              cols: 3,
            },
          },
          tooltip: {
            class: Tooltip,
            config: {
              location: "left",
              highlightColor: "#FFEFD5",
              underline: true,
              backgroundColor: "#FFEFD5",
              textColor: "#111827",
              holder: "editorId",
            },
          },
          code: editorjsCodeflask,
          header: {
            class: Header as unknown as ToolConstructable,
            config: {
              defaultLevel: 3,
              levels: [3, 4, 5],
            },
            inlineToolbar: true,
            tunes: ["anyTuneName"],
          },
          linkTool: {
            class: LinkTool,
            config: {
              endpoint: process.env.NEXT_PUBLIC_FRONT_URL + "/api/link",
            },
          },

          opensea: {
            class: OpenseaTool,
          },
          checklist: {
            class: Checklist,
            inlineToolbar: true,
          },
          list: {
            class: List,
            inlineToolbar: true,
            config: {
              defaultStyle: "unordered",
            },
          },
        },
        tunes: ["textVariant"],
      });
      await editor.isReady;
      // ref.current = editor;
    }
  }, [isMounted]);

  useEffect(() => {
    console.log("ref: ", ref);
  }, [ref]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    let interval = null;
    console.log("data render: ", {
      articleToRender,
      infos,
    });
    if (articleToRender && (infos?.state === "done" || infos?.state === "")) {
      clearInterval(interval);
      console.log("rendering article: ", articleToRender);
      ref.current?.blocks.renderFromHTML(articleToRender);
      setArticleToRender("");
    } else if (articleToRender && infos?.state === "generating") {
      interval = setInterval(() => {
        console.log("rendering article: ", articleToRender);
        ref.current?.blocks.renderFromHTML(articleToRender);
        console.log("block rendered");
      }, 200);
    }

    return () => {
      clearInterval(interval);
    };
  }, [articleToRender, infos]);

  useEffect(() => {
    if (isMounted) {
      initializeEditor();
    }
  }, [isMounted]);

  const {
    data: aiContent,
    isSuccess,
    isLoading,
    mutate: generateArticle,
  } = useMutation(["ai", subject], async () => {
    setInfos({
      urls: [],
      state: "link",
    });

    try {
      return fetch(`${process.env.AIRPEN_AI_API}/completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          userAddress: "landing",
          guidelines: "",
          tone: "informative",
          language: "",
          user_urls: [],
          articleId: _id,
        }),
      }).then(async (response) => {
        const html = await response.json();
        return html as string;
      });
    } catch (error) {
      console.log("error: ", error);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [infos]);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {ref.current?.blocks?.renderFromHTML && (
        <div className="relative z-10 flex items-center justify-center w-full max-w-lg gap-2 px-2 m-auto divide-x shadow-lg divide-gray-600 min-h-12 rounded-3xl shadow-black/40">
          <div className="flex items-center justify-center rounded-l-full">
            <Sparkle className="fill-grayz" />
          </div>
          <div className="flex items-center self-end flex-1 min-w-0">
            <form
              className="w-full h-full"
              onSubmit={(e) => {
                e.preventDefault();
                generateArticle();
              }}
            >
              <div className="relative w-full flex items-center transition-all duration-300 min-h-full h-fit">
                <label htmlFor="textarea-input" className="sr-only">
                  Prompt
                </label>
                <div className="relative flex flex-1 min-w-0 self-start">
                  <textarea
                    id="home-prompt"
                    maxLength={1000}
                    className="flex-[1_0_50%] bg-[#121212] min-w-[50%] disabled:opacity-80 text-white border-0 shadow-none resize-none outline-none ring-0 disabled:bg-transparent selection:bg-teal-300 selection:text-black placeholder:text-zinc-400 pl-3 py-3 sm:min-h-[15px] text-base md:text-sm"
                    spellCheck="false"
                    rows={1}
                    placeholder=" Top 5 Museums to visit in Paris this winter"
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="flex cursor-pointer items-center outline-none transition-colors focus-visible:ring-gs=gray-400 focus-visible:ring-1 bg-gs-gray-700 bg-airpen-gray justify-center w-8 h-8 rounded-full shrink-0 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gs-gray-700"
                  disabled={!subject || isLoading}
                >
                  <span className="sr-only">Send</span>
                  {!isLoading ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M13.5 3V2.25H15V3V10C15 10.5523 14.5522 11 14 11H3.56062L5.53029 12.9697L6.06062 13.5L4.99996 14.5607L4.46963 14.0303L1.39641 10.9571C1.00588 10.5666 1.00588 9.93342 1.39641 9.54289L4.46963 6.46967L4.99996 5.93934L6.06062 7L5.53029 7.53033L3.56062 9.5H13.5V3Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  ) : null}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {infos?.state && (
        <div
          className="flex flex-col overflow-y-scroll w-lg max-h-96 gap-4"
          ref={scrollRef}
        ></div>
      )}

      <article>
        <section
          id={EDITTOR_HOLDER_ID}
          className={`min-w-full max-w-[728px] break-words flex gap-y-4 items-center flex-col justify-center`}
        ></section>
      </article>
    </>
  );
};

export default LandingEditor;
