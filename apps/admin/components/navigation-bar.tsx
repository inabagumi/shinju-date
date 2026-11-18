"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  twMerge,
} from "@shinju-date/ui";
import { ChevronDown, Menu, User, X } from "lucide-react";
import NextLink from "next/link";
import { unstable_rethrow, usePathname } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import type { ComponentProps, ReactNode } from "react";

import { signOutAction } from "@/app/login/_actions/sign-out";
import { useActionToast } from "@/components/action-toast";
import Form, { SubmitButton } from "@/components/form";
import { LogoIcon } from "@/components/logo-icon";
import { SERVER_ACTION_FALLBACK_ERROR } from "@/lib/use-server-action";

function ActiveNavigationLink({
  href,
  ...props
}: ComponentProps<typeof NextLink>) {
  const pathname = usePathname();
  const path = typeof href === "string" ? href : href.pathname;

  return (
    <NextLink
      {...props}
      aria-current={pathname === path ? "page" : undefined}
      href={href}
    />
  );
}

function Link(props: ComponentProps<typeof NextLink>) {
  return (
    <Suspense fallback={<NextLink {...props} />}>
      <ActiveNavigationLink {...props} />
    </Suspense>
  );
}

interface NavigationItem {
  href: string;
  label: string;
}

const DATA_ITEMS: NavigationItem[] = [
  { href: "/videos", label: "動画管理" },
  { href: "/talents", label: "タレント管理" },
  { href: "/terms", label: "用語管理" },
  { href: "/recommended-queries", label: "おすすめクエリ管理" },
  { href: "/announcements", label: "お知らせ管理" },
  { href: "/feedback", label: "機能要望管理" },
];

const ANALYTICS_ITEMS: NavigationItem[] = [
  { href: "/analytics/search", label: "検索アナリティクス" },
  { href: "/analytics/click", label: "クリックアナリティクス" },
];

const USER_ITEMS: NavigationItem[] = [
  { href: "/account", label: "アカウント設定" },
  { href: "/system", label: "システム" },
];

/** `bg-primary` のバーの上に置くボタンとリンク */
const barItemClassName =
  "inline-flex items-center gap-1 rounded-control px-3 py-1.5 text-meta font-semibold transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground";

/** メニューの中のリンク。現在のページは `text-accent` で示す */
const menuLinkClassName =
  "aria-[current=page]:font-semibold aria-[current=page]:text-accent";

interface NavigationMenuProps {
  align?: "start" | "end";
  children: ReactNode;
  /** ボタンの中身。アイコンだけの場合は `label` で名前を付ける */
  trigger: ReactNode;
  label?: string;
}

/** バーのボタンから開くメニュー。クリックかキーボードで開く */
function NavigationMenu({
  align = "start",
  children,
  label,
  trigger,
}: NavigationMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={label}
          className={twMerge(
            barItemClassName,
            "data-[state=open]:bg-primary-foreground/10"
          )}
          type="button"
        >
          {trigger}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NavigationMenuLinksProps {
  items: NavigationItem[];
}

function NavigationMenuLinks({ items }: NavigationMenuLinksProps) {
  return items.map((item) => (
    <DropdownMenuItem asChild className={menuLinkClassName} key={item.href}>
      <Link href={item.href}>{item.label}</Link>
    </DropdownMenuItem>
  ));
}

/** ユーザーメニューのログアウト。失敗したときはトーストで知らせる */
function SignOutMenuItem() {
  const [isPending, startTransition] = useTransition();
  const { showToast } = useActionToast();

  const handleSelect = (event: Event) => {
    // 終わるまでメニューを開いたままにし、実行中の状態を項目に出す。閉じると
    // 項目が消え、成功したときの `redirect()` を Next.js に返せなくなる
    event.preventDefault();

    startTransition(async () => {
      let message: string | undefined;

      try {
        const state = await signOutAction();

        message = state.errors?.["generic"]?.[0];
      } catch (error) {
        // 成功したときの `redirect()` は、Next.js に任せる
        unstable_rethrow(error);
        message = SERVER_ACTION_FALLBACK_ERROR;
      }

      if (message) {
        showToast("danger", message);
      }
    });
  };

  return (
    <DropdownMenuItem disabled={isPending} onSelect={handleSelect}>
      ログアウト
    </DropdownMenuItem>
  );
}

interface NavigationBarProps {
  /** バーの右側に表示する最終同期の日時 */
  lastSync?: ReactNode;
}

export function NavigationBar({ lastSync }: NavigationBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav
      aria-label="メインメニュー"
      className="sticky top-0 z-50 bg-primary text-primary-foreground"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
        <NextLink
          className="flex shrink-0 items-center gap-2 rounded-control text-body font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
          href="/"
        >
          <LogoIcon className="size-7" />
          Admin UI
        </NextLink>

        {/* Desktop Navigation */}
        <div className="hidden grow items-center gap-1 md:flex">
          <NavigationMenu
            trigger={
              <>
                データ管理
                <ChevronDown aria-hidden="true" className="size-4" />
              </>
            }
          >
            <NavigationMenuLinks items={DATA_ITEMS} />
          </NavigationMenu>
          <NavigationMenu
            trigger={
              <>
                アナリティクス
                <ChevronDown aria-hidden="true" className="size-4" />
              </>
            }
          >
            <NavigationMenuLinks items={ANALYTICS_ITEMS} />
          </NavigationMenu>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {lastSync && (
            <p className="hidden text-caption text-primary-foreground/80 tabular-nums sm:block">
              {lastSync}
            </p>
          )}
          <div className="hidden md:block">
            <NavigationMenu
              align="end"
              label="ユーザーメニュー"
              trigger={<User aria-hidden="true" className="size-5" />}
            >
              <NavigationMenuLinks items={USER_ITEMS} />
              <DropdownMenuSeparator />
              <SignOutMenuItem />
            </NavigationMenu>
          </div>
          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
            className={twMerge(barItemClassName, "p-2 md:hidden")}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            type="button"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-primary-foreground/20 md:hidden">
          <div className="mx-auto max-w-7xl space-y-4 px-6 py-4">
            {lastSync && (
              <p className="text-caption text-primary-foreground/80 tabular-nums sm:hidden">
                {lastSync}
              </p>
            )}
            {[
              { items: DATA_ITEMS, title: "データ管理" },
              { items: ANALYTICS_ITEMS, title: "アナリティクス" },
              { items: USER_ITEMS, title: "アカウント" },
            ].map((group) => (
              <div className="space-y-1" key={group.title}>
                <p className="px-3 text-caption font-semibold text-primary-foreground/80">
                  {group.title}
                </p>
                {group.items.map((item) => (
                  <Link
                    className={twMerge(
                      barItemClassName,
                      "flex font-normal aria-[current=page]:bg-primary-foreground/10 aria-[current=page]:font-semibold"
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <Form
              action={signOutAction}
              className="border-t border-primary-foreground/20 pt-4"
            >
              <SubmitButton
                className={twMerge(
                  barItemClassName,
                  "w-full justify-start font-normal"
                )}
                variant="ghost"
              >
                ログアウト
              </SubmitButton>
            </Form>
          </div>
        </div>
      )}
    </nav>
  );
}
