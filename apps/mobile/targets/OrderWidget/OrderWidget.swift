import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Colors
private let brandRed = Color(red: 1, green: 0.188, blue: 0.188)

// MARK: - Status helpers
private func statusIcon(_ status: String) -> String {
    switch status {
    case "cooking":  return "flame.fill"
    case "ready":    return "checkmark.circle.fill"
    case "delivered": return "bag.fill"
    default:         return "clock.fill"
    }
}

private func statusLabel(_ status: String) -> String {
    switch status {
    case "cooking":  return "Tayyorlanmoqda"
    case "ready":    return "Tayyor!"
    case "delivered": return "Yetkazildi"
    default:         return status
    }
}

private func statusColor(_ status: String) -> Color {
    switch status {
    case "cooking":  return .orange
    case "ready":    return .green
    case "delivered": return brandRed
    default:         return .gray
    }
}

// MARK: - Widget

@available(iOS 16.2, *)
struct OrderWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OrderActivityAttributes.self) { context in
            // ── Lock Screen / Banner ──────────────────────────────────
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.8))
                .activitySystemActionForegroundColor(.white)

        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded (long press) ─────────────────────────────
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: statusIcon(context.state.status))
                        .foregroundColor(statusColor(context.state.status))
                        .font(.system(size: 28, weight: .bold))
                        .padding(.leading, 4)
                }

                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.kitchenName)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        Text(statusLabel(context.state.status))
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.estimatedTime)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                        Text("\(context.attributes.itemCount) taom")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }
                    .padding(.trailing, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    ProgressBar(status: context.state.status)
                        .padding(.horizontal, 8)
                        .padding(.bottom, 6)
                }

            } compactLeading: {
                // ── Compact (leading pill) ────────────────────────────
                Image(systemName: statusIcon(context.state.status))
                    .foregroundColor(statusColor(context.state.status))
                    .font(.system(size: 14, weight: .bold))

            } compactTrailing: {
                // ── Compact (trailing pill) ───────────────────────────
                Text(shortLabel(context.state.status))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)

            } minimal: {
                // ── Minimal (small dot) ───────────────────────────────
                Image(systemName: statusIcon(context.state.status))
                    .foregroundColor(statusColor(context.state.status))
                    .font(.system(size: 12, weight: .bold))
            }
            .widgetURL(URL(string: "launchdrop://order/\(context.attributes.orderId)"))
            .keylineTint(brandRed)
        }
    }

    private func shortLabel(_ status: String) -> String {
        switch status {
        case "cooking":  return "Pish..."
        case "ready":    return "Tayyor"
        case "delivered": return "Yetdi"
        default:         return "..."
        }
    }
}

// MARK: - Lock screen view
@available(iOS 16.2, *)
private struct LockScreenView: View {
    let context: ActivityViewContext<OrderActivityAttributes>

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: statusIcon(context.state.status))
                .foregroundColor(statusColor(context.state.status))
                .font(.system(size: 32, weight: .bold))

            VStack(alignment: .leading, spacing: 4) {
                Text(statusLabel(context.state.status))
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Text(context.state.kitchenName)
                    .font(.system(size: 13))
                    .foregroundColor(Color.white.opacity(0.7))
                Text(context.state.estimatedTime)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.7))
            }

            Spacer()

            Text("\(context.attributes.itemCount)")
                .font(.system(size: 22, weight: .black))
                .foregroundColor(.white)
                .padding(10)
                .background(brandRed.opacity(0.8))
                .clipShape(Circle())
        }
        .padding(16)
    }
}

// MARK: - Progress bar
@available(iOS 16.2, *)
private struct ProgressBar: View {
    let status: String

    private var progress: Double {
        switch status {
        case "cooking":  return 0.45
        case "ready":    return 0.85
        case "delivered": return 1.0
        default:         return 0.1
        }
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.white.opacity(0.2))
                    .frame(height: 6)
                RoundedRectangle(cornerRadius: 4)
                    .fill(statusColor(status))
                    .frame(width: geo.size.width * progress, height: 6)
                    .animation(.easeInOut(duration: 0.5), value: progress)
            }
        }
        .frame(height: 6)
    }
}

// MARK: - Bundle
@main
@available(iOS 16.2, *)
struct OrderWidgetBundle: WidgetBundle {
    var body: some Widget {
        OrderWidgetLiveActivity()
    }
}
