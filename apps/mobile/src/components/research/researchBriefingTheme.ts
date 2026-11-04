import { colors } from "../../theme";

export const researchBriefingTheme = {
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700" as const,
    marginTop: 8,
    marginBottom: 4,
  },
  heading2: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700" as const,
    marginTop: 8,
    marginBottom: 4,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  link: {
    color: colors.primary,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
};
