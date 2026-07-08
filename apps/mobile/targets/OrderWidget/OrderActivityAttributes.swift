import ActivityKit
import Foundation

struct OrderActivityAttributes: ActivityAttributes {
    public typealias ContentState = OrderStatus

    public struct OrderStatus: Codable, Hashable {
        var status: String        // "cooking" | "ready" | "delivered"
        var kitchenName: String
        var estimatedTime: String // "12:30 — 13:00"
    }

    var orderId: String
    var itemCount: Int
}
