import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

const anonWork = {
  messages: [{ role: "user", content: "hello" }],
  fileSystemData: { "/": null, "/index.tsx": "code" },
};

const existingProjects = [
  { id: "proj-1", name: "My Project" },
  { id: "proj-2", name: "Older Project" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-proj" } as any);
});

describe("useAuth", () => {
  describe("initial state", () => {
    it("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    describe("happy path — with anonymous work", () => {
      it("creates a project from anon work, clears it, and redirects", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "saved-anon" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonWork.messages,
            data: anonWork.fileSystemData,
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/saved-anon");
        expect(mockGetProjects).not.toHaveBeenCalled();
      });
    });

    describe("happy path — no anon work, existing projects", () => {
      it("redirects to the most recent project", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue(existingProjects as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-1");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    describe("happy path — no anon work, no existing projects", () => {
      it("creates a new project and redirects to it", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/brand-new");
      });
    });

    describe("failed sign in", () => {
      it("returns the failure result without navigating", async () => {
        mockSignInAction.mockResolvedValue({
          success: false,
          error: "Invalid credentials",
        });

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "wrong");
        });

        expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    describe("isLoading", () => {
      it("is true while sign in is in progress and false after", async () => {
        let resolveSignIn!: (v: any) => void;
        mockSignInAction.mockReturnValue(
          new Promise((res) => { resolveSignIn = res; })
        );
        mockGetProjects.mockResolvedValue([]);

        const { result } = renderHook(() => useAuth());

        let promise: Promise<any>;
        act(() => {
          promise = result.current.signIn("user@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
          resolveSignIn({ success: true });
          await promise;
        });

        expect(result.current.isLoading).toBe(false);
      });

      it("resets isLoading to false even when sign in fails", async () => {
        mockSignInAction.mockResolvedValue({ success: false, error: "Error" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    it("passes email and password to the sign in action", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "err" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "secret99");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "secret99");
    });
  });

  describe("signUp", () => {
    describe("happy path — with anonymous work", () => {
      it("creates a project from anon work, clears it, and redirects", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "saved-anon" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonWork.messages,
            data: anonWork.fileSystemData,
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/saved-anon");
      });
    });

    describe("happy path — no anon work, existing projects", () => {
      it("redirects to the most recent project", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue(existingProjects as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-1");
      });
    });

    describe("happy path — no anon work, no existing projects", () => {
      it("creates a new project and redirects", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "fresh" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/fresh");
      });
    });

    describe("failed sign up", () => {
      it("returns the failure result without navigating", async () => {
        mockSignUpAction.mockResolvedValue({
          success: false,
          error: "Email already registered",
        });

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("taken@example.com", "password123");
        });

        expect(returnValue).toEqual({
          success: false,
          error: "Email already registered",
        });
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    describe("isLoading", () => {
      it("is true while sign up is in progress and false after", async () => {
        let resolveSignUp!: (v: any) => void;
        mockSignUpAction.mockReturnValue(
          new Promise((res) => { resolveSignUp = res; })
        );
        mockGetProjects.mockResolvedValue([]);

        const { result } = renderHook(() => useAuth());

        let promise: Promise<any>;
        act(() => {
          promise = result.current.signUp("new@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
          resolveSignUp({ success: true });
          await promise;
        });

        expect(result.current.isLoading).toBe(false);
      });

      it("resets isLoading to false even when sign up fails", async () => {
        mockSignUpAction.mockResolvedValue({ success: false, error: "Error" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    it("passes email and password to the sign up action", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "err" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "mypassword");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "mypassword");
    });
  });

  describe("anon work edge cases", () => {
    it("does not migrate anon work when messages array is empty", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue(existingProjects as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    it("does not navigate to anon project when getAnonWorkData returns null", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(existingProjects as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });
  });
});
