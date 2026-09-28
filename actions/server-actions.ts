"use server";

import { revalidateTag } from "next/cache";

export const revalidateData = async () => {
  revalidateTag("data");
};
