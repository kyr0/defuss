import type { FC } from "defuss";
import { Header } from "../components/Header.js";
import { Sidebar } from "../components/Sidebar.js";
import { OnThisPage } from "../components/OnThisPage.js";

export const MainLayout: FC = ({ children }) => {
    return (
        <>
            <Sidebar />
            <main class="flex-1 min-w-0 flex flex-col">
                <Header />
                <div class="p-4 md:p-6 xl:p-12">

                    <main class="mx-auto relative flex w-full max-w-screen-lg gap-10">
                        <div id="page-content" class="flex-1 min-w-0">
                            {children}
                        </div>
                        <OnThisPage />
                    </main>
                </div>
            </main>
        </>
    );
};
