import { type Props, T, Router } from "defuss";
import { Footer } from "../components/footer";
import { Swiper } from "../components/swiper";
import { SwipeSlide } from "../components/swipe-slide";
import { WavesBackground } from "../components/waves";

export interface HomeScreenProps extends Props {
	// current click counter, passed down by SSR
	news: Array<{
		title: string;
		description: string;
		link: string;
	}>;
}

export function HomeScreen({ news }: HomeScreenProps) {
	function goToLogin() {
		Router.navigate("/login");
	}

	function goToSignup() {
		Router.navigate("/signup");
	}

	return (
		<div style="position: relative;">
			<WavesBackground />
			<div class="container-main" style="position: relative; z-index: 1;">
				<header class="text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<span class="material-icons text-7xl text-primary mb-2">
						emoji_objects
					</span>
					<T tag="h1" class="app-title text-4xl mb-2" key="home.title" />
					<T
						tag="p"
						class="text-gray-600 mt-2 text-lg"
						key="home.description"
					/>
				</header>

				<div class="home-action-buttons">
					<button
						type="button"
						class="action-button primary"
						onClick={goToSignup}
					>
						<span class="material-icons">person_add</span>
						<T key="signup.sign_up_button" />
					</button>
					<button
						type="button"
						class="action-button secondary"
						onClick={goToLogin}
					>
						<span class="material-icons">login</span>
						<T key="login.sign_in_button" />
					</button>
				</div>
				<main class="p-0">
					<Swiper
						id="featureGallery"
						showNavigation={true}
						showPagination={true}
					>
						<SwipeSlide>
							<img alt="Community Support Icon" src="/tour/1.png" />
							<T tag="h3" key="home.features.support.title" />
							<T tag="p" key="home.features.support.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img alt="Message in a Bottle Icon" src="/tour/2.png" />
							<T tag="h3" key="home.features.bottles.title" />
							<T tag="p" key="home.features.bottles.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img
								alt="Positive Reactions Icon"
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0r_Y_Z_X_W_V_U_T_S_R_Q_P_O_N_M_L_K_J_I_H_G_F_E_D_C_B_A_z_y_x_w_v_u_t_s_r_q_p_o_n_m_l_k_j_i_h_g_f_e_d_c_b_a"
							/>
							<T tag="h3" key="home.features.reactions.title" />
							<T tag="p" key="home.features.reactions.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img
								alt="Building Connections Icon"
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuAL0g_h_I_j_K_l_M_n_O_p_Q_r_S_t_U_v_W_x_Y_z_A_b_C_d_E_f_G_h_I_j_K_l_M_n_O_p_Q_r_S_t_U_v_W_x_Y_z_A_b_C_d_E_f_G_h"
							/>
							<T tag="h3" key="home.features.connections.title" />
							<T tag="p" key="home.features.connections.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img
								alt="Mindful Sharing Icon"
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgpu_GK1B5jx6yDioixQIRTkRUXdMZ4c0L21y1WHvTjq8Hy48W21GMi1Omcn3z-EUI7p3kOCU53qOFUrL6w1f_EsbQ_T8BOUQMPsbYY_EY90DOc7M_zw2MVNLD55VKPscCql0h1mp7sX0_-ffWAAT-yUeKfUqt54vDtDK8q2CtLkAUqI-fDvqZiwAld5TcqsirM-VWvyuHmK_Ct4tcKhTKrQjxGBMaYIb7gg8Iq5hmJ79uQTX9qpsI0wRIaF4KonXqTPW7W2nLJ_OJ"
							/>
							<T tag="h3" key="home.features.mindful.title" />
							<T tag="p" key="home.features.mindful.description" />
						</SwipeSlide>
					</Swiper>
				</main>
				<div class="p-6 md:p-8 text-center space-y-4">
					<a class="action-button primary" href="/about">
						<T key="about.title" />
						<span class="material-icons ml-2">arrow_forward</span>
					</a>
				</div>
			</div>
			<Footer />
		</div>
	);
}
