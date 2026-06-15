import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createClient } from "@/utils/supabase/server";

/** Supabase users 表中用于登录校验的用户记录结构。 */
type StoredUser = {
  /** 用户主键，由数据库自动生成。 */
  id: string;
  /** 用户姓名，用于展示登录用户。 */
  name: string;
  /** bcrypt 加密后的密码摘要，用于登录比对。 */
  password: string;
  /** 用户手机号，用作登录账号。 */
  phone: string;
};

/** 判断数据库中的密码是否为 bcrypt 摘要，参数 password 为 users 表中读取到的密码字段。 */
function isBcryptHash(password: string) {
  return /^\$2[aby]\$/.test(password);
}

/** 校验用户输入密码，参数 password 为用户输入值，storedPassword 为数据库中的密码字段。 */
async function verifyPassword(password: string, storedPassword: string) {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(password, storedPassword);
  }

  return password === storedPassword;
}

/** 将历史明文密码升级为 bcrypt 摘要，参数 userId 为用户 id，password 为本次已校验通过的明文密码。 */
async function upgradePlainPassword(userId: string, password: string) {
  const supabase = await createClient();
  const hashedPassword = await bcrypt.hash(password, 10);

  await supabase
    .from("users")
    .update({ password: hashedPassword })
    .eq("id", userId);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/users/auth",
  callbacks: {
    /** 将用户 id 和手机号写入 JWT，供后续 session 回调使用。 */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
      }

      return token;
    },
    /** 将 JWT 中的用户 id 和手机号同步到前端可读取的 session。 */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        password: { label: "密码", type: "password" },
        phone: { label: "手机号", type: "text" },
      },
      /** 根据手机号查询 users 表，并用 bcrypt 校验用户输入的密码。 */
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!phone || password.length < 4) {
          return null;
        }

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("users")
          .select("id,name,phone,password")
          .eq("phone", phone)
          .single<StoredUser>();

        if (error || !data) {
          return null;
        }

        const isPasswordValid = await verifyPassword(password, data.password);

        if (!isPasswordValid) {
          return null;
        }

        if (!isBcryptHash(data.password)) {
          await upgradePlainPassword(data.id, password);
        }

        return {
          id: data.id,
          name: data.name,
          phone: data.phone,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
