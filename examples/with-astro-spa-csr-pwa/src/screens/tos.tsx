import { type Props, T, $ } from "defuss";
import { Footer } from "../components/footer";

export interface TosScreenProps extends Props {}

export function TosScreen(_props: TosScreenProps) {
	let activeTab = "terms";

	$(() => {
		console.log("Checking URL for active tab");
		const urlParams = new URLSearchParams(window.location.search);
		const tab = urlParams.get("tab");
		if (tab === "privacy-policy") {
			activeTab = "privacy-policy";
			showTab("privacy-policy");
		}
	});

	function showTab(tabName: string) {
		activeTab = tabName;

		// Update URL without reloading
		const url = new URL(window.location.href);
		url.searchParams.set("tab", tabName);
		history.replaceState(null, "", url.toString());

		// Hide all tab contents
		const tabContents = document.querySelectorAll(".tab-content");
		for (const content of tabContents) {
			content.classList.remove("active");
		}

		// Remove active class from all tab buttons
		const tabButtons = document.querySelectorAll(".tab-button");
		for (const button of tabButtons) {
			button.classList.remove("active");
		}

		// Show selected tab content
		const selectedContent = document.getElementById(tabName);
		if (selectedContent) {
			selectedContent.classList.add("active");
		}

		// Add active class to selected button
		const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
		if (selectedButton) {
			selectedButton.classList.add("active");
		}
	}

	function goBack() {
		window.history.back();
	}

	return (
		<div>
			<div class="container-main">
				{/* Back button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={goBack}>
					<span class="material-icons">arrow_back</span>
					<T key="common.back" />
				</button>

				<header class="page-header">
					<h1 class="page-title">
						<T key="tos.title" />
					</h1>
				</header>

				<div class="tabs">
					<button
						type="button"
						class={`tab-button ${activeTab === "terms" ? "active" : ""}`}
						data-tab="terms"
						onClick={() => showTab("terms")}
					>
						<T key="tos.terms_of_service" />
					</button>
					<button
						type="button"
						class={`tab-button ${activeTab === "privacy-policy" ? "active" : ""}`}
						data-tab="privacy-policy"
						onClick={() => showTab("privacy-policy")}
					>
						<T key="tos.privacy_policy" />
					</button>
				</div>

				<main>
					<div
						class={`tab-content ${activeTab === "terms" ? "active" : ""}`}
						id="terms"
					>
						<div class="content-section">
							<p class="text-sm text-gray-600">
								<strong>
									<T key="tos.last_updated" />
								</strong>
							</p>
							<p>
								<T key="tos.terms.intro" />
							</p>
							<p>
								<T key="tos.terms.acceptance" />
							</p>
							<p>
								<T key="tos.terms.agreement" />
							</p>

							<h2>
								<T key="tos.terms.eligibility.title" />
							</h2>
							<p>
								<T key="tos.terms.eligibility.content" />
							</p>

							<h2>
								<T key="tos.terms.accounts.title" />
							</h2>
							<p>
								<T key="tos.terms.accounts.content1" />
							</p>
							<p>
								<T key="tos.terms.accounts.content2" />
							</p>

							<h2>
								<T key="tos.terms.features.title" />
							</h2>
							<h3>
								<T key="tos.terms.features.messages.title" />
							</h3>
							<p>
								<T key="tos.terms.features.messages.content" />
							</p>

							<h3>
								<T key="tos.terms.features.reactions.title" />
							</h3>
							<p>
								<T key="tos.terms.features.reactions.content" />
							</p>

							<h3>
								<T key="tos.terms.features.connections.title" />
							</h3>
							<p>
								<T key="tos.terms.features.connections.content" />
							</p>

							<h3>
								<T key="tos.terms.features.prohibited.title" />
							</h3>
							<p>
								<T key="tos.terms.features.prohibited.intro" />
							</p>
							<ul>
								<li>
									<T key="tos.terms.features.prohibited.list.1" />
								</li>
								<li>
									<T key="tos.terms.features.prohibited.list.2" />
								</li>
								<li>
									<T key="tos.terms.features.prohibited.list.3" />
								</li>
								<li>
									<T key="tos.terms.features.prohibited.list.4" />
								</li>
								<li>
									<T key="tos.terms.features.prohibited.list.5" />
								</li>
								<li>
									<T key="tos.terms.features.prohibited.list.6" />
								</li>
							</ul>

							<h2>
								<T key="tos.terms.ip.title" />
							</h2>
							<p>
								<T key="tos.terms.ip.content1" />
							</p>
							<p>
								<T key="tos.terms.ip.content2" />
							</p>

							<h2>
								<T key="tos.terms.termination.title" />
							</h2>
							<p>
								<T key="tos.terms.termination.content1" />
							</p>
							<p>
								<T key="tos.terms.termination.content2" />
							</p>

							<h2>
								<T key="tos.terms.liability.title" />
							</h2>
							<p>
								<T key="tos.terms.liability.content" />
							</p>

							<h2>
								<T key="tos.terms.disclaimer.title" />
							</h2>
							<p>
								<T key="tos.terms.disclaimer.content1" />
							</p>
							<p>
								<T key="tos.terms.disclaimer.content2" />
							</p>

							<h2>
								<T key="tos.terms.law.title" />
							</h2>
							<p>
								<T key="tos.terms.law.content" />
							</p>

							<h2>
								<T key="tos.terms.changes.title" />
							</h2>
							<p>
								<T key="tos.terms.changes.content" />
							</p>

							<h2>
								<T key="tos.terms.contact.title" />
							</h2>
							<p>
								<T key="tos.terms.contact.content" />
							</p>
						</div>
					</div>

					<div
						class={`tab-content ${activeTab === "privacy-policy" ? "active" : ""}`}
						id="privacy-policy"
					>
						<div class="content-section">
							<p class="text-sm text-gray-600">
								<strong>
									<T key="tos.last_updated" />
								</strong>
							</p>
							<p>
								<T key="tos.privacy.intro" />
							</p>

							<h2>
								<T key="tos.privacy.collection.title" />
							</h2>
							<p>
								<T key="tos.privacy.collection.intro" />
							</p>

							<h3>
								<T key="tos.privacy.collection.provided.title" />
							</h3>
							<ul>
								<li>
									<strong>
										<T key="tos.privacy.collection.provided.account.title" />:
									</strong>{" "}
									<T key="tos.privacy.collection.provided.account.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.collection.provided.content.title" />:
									</strong>{" "}
									<T key="tos.privacy.collection.provided.content.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.collection.provided.comms.title" />:
									</strong>{" "}
									<T key="tos.privacy.collection.provided.comms.content" />
								</li>
							</ul>

							<h3>
								<T key="tos.privacy.collection.automatic.title" />
							</h3>
							<ul>
								<li>
									<strong>
										<T key="tos.privacy.collection.automatic.usage.title" />:
									</strong>{" "}
									<T key="tos.privacy.collection.automatic.usage.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.collection.automatic.device.title" />:
									</strong>{" "}
									<T key="tos.privacy.collection.automatic.device.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.collection.automatic.log.title" />:
									</strong>{" "}
									<T key="tos.privacy.collection.automatic.log.content" />
								</li>
							</ul>

							<h2>
								<T key="tos.privacy.usage.title" />
							</h2>
							<p>
								<T key="tos.privacy.usage.intro" />
							</p>
							<ul>
								<li>
									<T key="tos.privacy.usage.list.1" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.2" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.3" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.4" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.5" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.6" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.7" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.8" />
								</li>
								<li>
									<T key="tos.privacy.usage.list.9" />
								</li>
							</ul>

							<h2>
								<T key="tos.privacy.sharing.title" />
							</h2>
							<p>
								<T key="tos.privacy.sharing.intro" />
							</p>
							<ul>
								<li>
									<strong>
										<T key="tos.privacy.sharing.users.title" />:
									</strong>{" "}
									<T key="tos.privacy.sharing.users.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.sharing.vendors.title" />:
									</strong>{" "}
									<T key="tos.privacy.sharing.vendors.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.sharing.legal.title" />:
									</strong>{" "}
									<T key="tos.privacy.sharing.legal.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.sharing.merger.title" />:
									</strong>{" "}
									<T key="tos.privacy.sharing.merger.content" />
								</li>
								<li>
									<strong>
										<T key="tos.privacy.sharing.consent.title" />:
									</strong>{" "}
									<T key="tos.privacy.sharing.consent.content" />
								</li>
							</ul>

							<h2>
								<T key="tos.privacy.retention.title" />
							</h2>
							<p>
								<T key="tos.privacy.retention.content" />
							</p>

							<h2>
								<T key="tos.privacy.choices.title" />
							</h2>
							<p>
								<T key="tos.privacy.choices.intro" />
							</p>
						</div>
					</div>
				</main>
			</div>
			<Footer />
		</div>
	);
}
