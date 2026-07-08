import ActivityKit
import ExpoModulesCore
import Foundation

public class LiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

        // Start a new Live Activity
        AsyncFunction("startActivity") { (params: [String: Any]) -> String? in
            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let orderId    = params["orderId"]    as? String ?? ""
            let itemCount  = params["itemCount"]  as? Int    ?? 1
            let status     = params["status"]     as? String ?? "cooking"
            let kitchen    = params["kitchenName"] as? String ?? ""
            let time       = params["estimatedTime"] as? String ?? ""

            let attributes = OrderActivityAttributes(orderId: orderId, itemCount: itemCount)
            let state      = OrderActivityAttributes.OrderStatus(
                status: status, kitchenName: kitchen, estimatedTime: time
            )

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                return activity.id
            } catch {
                return nil
            }
        }

        // Update existing activity
        AsyncFunction("updateActivity") { (activityId: String, params: [String: Any]) in
            guard #available(iOS 16.2, *) else { return }

            let status  = params["status"]       as? String ?? "cooking"
            let kitchen = params["kitchenName"]  as? String ?? ""
            let time    = params["estimatedTime"] as? String ?? ""

            let newState = OrderActivityAttributes.OrderStatus(
                status: status, kitchenName: kitchen, estimatedTime: time
            )

            for activity in Activity<OrderActivityAttributes>.activities where activity.id == activityId {
                await activity.update(.init(state: newState, staleDate: nil))
            }
        }

        // End activity
        AsyncFunction("endActivity") { (activityId: String) in
            guard #available(iOS 16.2, *) else { return }

            for activity in Activity<OrderActivityAttributes>.activities where activity.id == activityId {
                await activity.end(nil, dismissalPolicy: .after(Date.now.addingTimeInterval(5)))
            }
        }

        // Check if supported
        Function("isSupported") { () -> Bool in
            guard #available(iOS 16.2, *) else { return false }
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }
    }
}
